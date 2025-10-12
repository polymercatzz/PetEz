// Pet Sitter Controller
const axios = require('axios');

const petsitterController = {
    // View controllers
    getPetsitterProfile: async (req, res) => {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/');
        }
        try {
            // Fetch sitter profile SSR so we can render documents/details
            const sitterApiUrl = 'http://sitter-service:3004/profile';
            const response = await axios.get(sitterApiUrl, {
                headers: { 'Authorization': `Bearer ${req.session.token}` }
            });
            const sitter = response.data?.sitter || null;
            res.render('petsitter/profile-sitter', { title: 'โปรไฟล์พี่เลี้ยงสัตว์', user, sitter });
        } catch (error) {
            // If profile doesn't exist yet (404) or any error, render with null sitter
            if (error.response && error.response.status === 404) {
                return res.render('petsitter/profile-sitter', { title: 'โปรไฟล์พี่เลี้ยงสัตว์', user, sitter: null });
            }
            console.error('SSR sitter profile load failed:', error.response?.status, error.response?.data || error.message);
            return res.render('petsitter/profile-sitter', { title: 'โปรไฟล์พี่เลี้ยงสัตว์', user, sitter: null });
        }
    },

    getPetsitterRegister: (req, res) => {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/');
        }
        // Use existing create-sitter.ejs
        res.render('petsitter/create-sitter', { title: 'สร้างบริการของพี่เลี้ยง', user: user });
    },

    getAvailableJobs: async (req, res) => {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/');
        }
        try {
            // Pull open customer requests for sitters
            const sitterApiUrl = 'http://sitter-service:3004/requests';
            const response = await axios.get(sitterApiUrl, {
                headers: { 'Authorization': `Bearer ${req.session.token}` },
                params: { status: 'open', ...(req.query || {}) }
            });
            const requests = response.data?.requests || [];
            res.render('petsitter/work', { title: 'คำขอที่เปิดอยู่', user, jobs: requests });
        } catch (error) {
            console.error('SSR jobs load failed:', error.response?.status, error.response?.data || error.message);
            res.render('petsitter/work', { title: 'คำขอที่เปิดอยู่', user, jobs: [] });
        }
    },

    getJobHistory: async (req, res) => {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/');
        }
        try {
            const sitterApiUrl = 'http://sitter-service:3004/my-jobs';
            const [accResp, compResp] = await Promise.all([
                axios.get(sitterApiUrl, { headers: { 'Authorization': `Bearer ${req.session.token}` }, params: { status: 'accepted' } }),
                axios.get(sitterApiUrl, { headers: { 'Authorization': `Bearer ${req.session.token}` }, params: { status: 'completed' } })
            ]);
            const acceptedJobs = accResp.data?.jobs || accResp.data?.bookings || [];
            const completedJobs = compResp.data?.jobs || compResp.data?.bookings || [];
            res.render('petsitter/history-sitter', { title: 'ประวัติการทำงาน', user, acceptedJobs, completedJobs });
        } catch (error) {
            console.error('SSR history load failed:', error.response?.status, error.response?.data || error.message);
            res.render('petsitter/history-sitter', { title: 'ประวัติการทำงาน', user, acceptedJobs: [], completedJobs: [] });
        }
    },

    getWorkDetail: async (req, res) => {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/');
        }
        const jobId = req.params.id;
        try {
            // Try to find job in my accepted/completed jobs first
            const sitterMyUrl = 'http://sitter-service:3004/my-jobs';
            const [accResp, compResp] = await Promise.all([
                axios.get(sitterMyUrl, { headers: { 'Authorization': `Bearer ${req.session.token}` }, params: { status: 'accepted' } }),
                axios.get(sitterMyUrl, { headers: { 'Authorization': `Bearer ${req.session.token}` }, params: { status: 'completed' } })
            ]);
            const pool = [ ...(accResp.data?.jobs || []), ...(compResp.data?.jobs || []) ];
            let finalJob = pool.find(j => String(j.booking_id || j.id) === String(jobId));
            // If not found, check available jobs
            if (!finalJob) {
                const availResp = await axios.get('http://sitter-service:3004/jobs', { headers: { 'Authorization': `Bearer ${req.session.token}` } });
                const jobs = availResp.data?.jobs || [];
                finalJob = jobs.find(j => String(j.booking_id || j.id) === String(jobId));
            }
            // First try: treat id as booking id (legacy job flow)
            let job = finalJob;
                try {
                    const sitterMyUrl = 'http://sitter-service:3004/my-jobs';
                    const [accResp, compResp] = await Promise.all([
                        axios.get(sitterMyUrl, { headers: { 'Authorization': `Bearer ${req.session.token}` }, params: { status: 'accepted' } }),
                        axios.get(sitterMyUrl, { headers: { 'Authorization': `Bearer ${req.session.token}` }, params: { status: 'completed' } })
                    ]);
                    const pool = [ ...(accResp.data?.jobs || []), ...(compResp.data?.jobs || []) ];
                    job = pool.find(j => String(j.booking_id || j.id) === String(jobId));
                } catch (e) {}

                // If not found, check request detail (new request flow)
                if (!job) {
                    const reqResp = await axios.get(`http://sitter-service:3004/requests/${jobId}`, {
                        headers: { 'Authorization': `Bearer ${req.session.token}` }
                    });
                    // Map request fields into a job-like object for the view
                    const r = reqResp.data?.request || null;
                    if (r) {
                        job = {
                            id: r.request_id,
                            user_id: r.user_id,
                            status: r.status,
                            description: r.description,
                            service_type: r.service_type || null,
                            start_date: r.preferred_date || null,
                            end_date: null,
                            total_price: null,
                            User: null,
                            Pet: null
                        };
                        // Enrich User contact info from auth-service if possible
                        try {
                            const usersResp = await axios.get('http://auth-service:3002/api/users/all');
                            const users = usersResp.data?.users || [];
                            const u = users.find(u => String(u.user_id) === String(r.user_id));
                            if (u) {
                                job.User = {
                                    username: u.username,
                                    full_name: u.full_name,
                                    email: u.email,
                                    phone: u.phone,
                                    address: u.address,
                                    district: u.district,
                                    province: u.province,
                                    postal_code: u.postal_code
                                };
                            }
                        } catch (e) {
                            // best-effort enrichment; ignore errors
                        }
                    }
                }
                res.render('petsitter/work-detail', { title: 'รายละเอียดงาน', user, job, jobId });
        } catch (error) {
            console.error('SSR work-detail load failed:', error.response?.status, error.response?.data || error.message);
            res.render('petsitter/work-detail', { title: 'รายละเอียดงาน', user, job: null, jobId });
        }
    },

    // API controllers
    registerPetsitter: async (req, res) => {
        try {
            const user = req.session.user;
            if (!user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            const sitterApiUrl = 'http://sitter-service:3004/register';
            const response = await axios.post(sitterApiUrl, req.body, {
                headers: {
                    'Authorization': `Bearer ${req.session.token}`,
                    'Content-Type': 'application/json'
                }
            });

            res.json(response.data);
        } catch (error) {
            if (error.response) {
                res.status(error.response.status).json(error.response.data);
            } else {
                console.error('Error registering pet sitter:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    },

    getPetsitterProfileData: async (req, res) => {
        try {
            const user = req.session.user;
            if (!user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            const sitterApiUrl = 'http://sitter-service:3004/profile';
            const response = await axios.get(sitterApiUrl, {
                headers: {
                    'Authorization': `Bearer ${req.session.token}`
                }
            });

            res.json(response.data);
        } catch (error) {
            if (error.response && error.response.status === 404) {
                res.status(404).json({ message: 'Sitter profile not found' });
            } else if (error.response) {
                res.status(error.response.status).json(error.response.data);
            } else {
                console.error('Error fetching pet sitter profile:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    },

    updatePetsitterProfile: async (req, res) => {
        try {
            const user = req.session.user;
            if (!user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            const sitterApiUrl = 'http://sitter-service:3004/profile';
            const response = await axios.put(sitterApiUrl, req.body, {
                headers: {
                    'Authorization': `Bearer ${req.session.token}`,
                    'Content-Type': 'application/json'
                }
            });

            res.json(response.data);
        } catch (error) {
            if (error.response) {
                res.status(error.response.status).json(error.response.data);
            } else {
                console.error('Error updating pet sitter profile:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    },

    getJobs: async (req, res) => {
        try {
            const user = req.session.user;
            if (!user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            // Fetch available jobs from sitter service
            const sitterApiUrl = 'http://sitter-service:3004/jobs';
            const response = await axios.get(sitterApiUrl, {
                headers: {
                    'Authorization': `Bearer ${req.session.token}`
                },
                params: req.query
            });

            res.json(response.data);
        } catch (error) {
            if (error.response) {
                console.error('Failed to fetch available jobs:', error.response.status, error.response.data);
                res.status(error.response.status).json(error.response.data);
            } else {
                console.error('Error fetching jobs:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    },

    acceptJob: async (req, res) => {
        try {
            const jobId = req.params.id;
            const user = req.session.user;
            
            if (!user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            // Accept job in sitter service
            const sitterApiUrl = `http://sitter-service:3004/jobs/${jobId}/accept`;
            const response = await axios.post(sitterApiUrl, {}, {
                headers: {
                    'Authorization': `Bearer ${req.session.token}`
                }
            });

            res.json(response.data);
        } catch (error) {
            if (error.response) {
                res.status(error.response.status).json(error.response.data);
                        // Try accept booking job first; if fails as 404, try accept request
                        const tryAccept = async () => {
                            // Accept job (booking)
                            const urlJob = `http://sitter-service:3004/jobs/${jobId}/accept`;
                            try {
                                return await axios.post(urlJob, {}, { headers: { 'Authorization': `Bearer ${req.session.token}` } });
                            } catch (err) {
                                if (err.response && err.response.status === 404) {
                                    // Accept request
                                    const urlReq = `http://sitter-service:3004/requests/${jobId}/accept`;
                                    return await axios.post(urlReq, {}, { headers: { 'Authorization': `Bearer ${req.session.token}` } });
                                }
                                throw err;
                            }
                        };

                        const response = await tryAccept();

                res.status(500).json({ error: 'Internal server error' });
            }
        }
    },

    getPetsitterBookings: async (req, res) => {
        try {
            const user = req.session.user;
            if (!user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            // Get petsitter's accepted bookings from sitter service
            const sitterApiUrl = 'http://sitter-service:3004/my-jobs';
            const response = await axios.get(sitterApiUrl, {
                headers: {
                    'Authorization': `Bearer ${req.session.token}`
                },
                params: req.query
            });

            res.json(response.data);
        } catch (error) {
            if (error.response) {
                res.status(error.response.status).json(error.response.data);
            } else {
                console.error('Error fetching petsitter bookings:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    },

    updateBookingStatus: async (req, res) => {
        try {
            const bookingId = req.params.id;
            const user = req.session.user;
            
            if (!user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            // Update booking status in sitter service
            const sitterApiUrl = `http://sitter-service:3004/jobs/${bookingId}/status`;
            const response = await axios.put(sitterApiUrl, req.body, {
                headers: {
                    'Authorization': `Bearer ${req.session.token}`,
                    'Content-Type': 'application/json'
                }
            });

            res.json(response.data);
        } catch (error) {
            if (error.response) {
                res.status(error.response.status).json(error.response.data);
            } else {
                console.error('Error updating booking status:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    },

    // New methods for sitter service integration
    getSitterServices: async (req, res) => {
        try {
            const user = req.session.user;
            if (!user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            const sitterApiUrl = 'http://sitter-service:3004/services';
            const response = await axios.get(sitterApiUrl, {
                headers: {
                    'Authorization': `Bearer ${req.session.token}`
                }
            });

            res.json(response.data);
        } catch (error) {
            if (error.response) {
                res.status(error.response.status).json(error.response.data);
            } else {
                console.error('Error fetching sitter services:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    },

    addSitterService: async (req, res) => {
        try {
            const user = req.session.user;
            if (!user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            const sitterApiUrl = 'http://sitter-service:3004/services';
            const response = await axios.post(sitterApiUrl, req.body, {
                headers: {
                    'Authorization': `Bearer ${req.session.token}`,
                    'Content-Type': 'application/json'
                }
            });

            res.json(response.data);
        } catch (error) {
            if (error.response) {
                res.status(error.response.status).json(error.response.data);
            } else {
                console.error('Error adding sitter service:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    },

    updateSitterService: async (req, res) => {
        try {
            const serviceId = req.params.id;
            const user = req.session.user;
            
            if (!user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            const sitterApiUrl = `http://sitter-service:3004/services/${serviceId}`;
            const response = await axios.put(sitterApiUrl, req.body, {
                headers: {
                    'Authorization': `Bearer ${req.session.token}`,
                    'Content-Type': 'application/json'
                }
            });

            res.json(response.data);
        } catch (error) {
            if (error.response) {
                res.status(error.response.status).json(error.response.data);
            } else {
                console.error('Error updating sitter service:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    },

    deleteSitterService: async (req, res) => {
        try {
            const serviceId = req.params.id;
            const user = req.session.user;
            
            if (!user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            const sitterApiUrl = `http://sitter-service:3004/services/${serviceId}`;
            const response = await axios.delete(sitterApiUrl, {
                headers: {
                    'Authorization': `Bearer ${req.session.token}`
                }
            });

            res.json(response.data);
        } catch (error) {
            if (error.response) {
                res.status(error.response.status).json(error.response.data);
            } else {
                console.error('Error deleting sitter service:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    },

    getSitterEarnings: async (req, res) => {
        try {
            const user = req.session.user;
            if (!user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            const sitterApiUrl = 'http://sitter-service:3004/earnings';
            const response = await axios.get(sitterApiUrl, {
                headers: {
                    'Authorization': `Bearer ${req.session.token}`
                },
                params: req.query
            });

            res.json(response.data);
        } catch (error) {
            if (error.response) {
                res.status(error.response.status).json(error.response.data);
            } else {
                console.error('Error fetching sitter earnings:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    },

    getSitterStatistics: async (req, res) => {
        try {
            const user = req.session.user;
            if (!user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            const sitterApiUrl = 'http://sitter-service:3004/statistics';
            const response = await axios.get(sitterApiUrl, {
                headers: {
                    'Authorization': `Bearer ${req.session.token}`
                }
            });

            res.json(response.data);
        } catch (error) {
            if (error.response) {
                res.status(error.response.status).json(error.response.data);
            } else {
                console.error('Error fetching sitter statistics:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    },

    // Note: sitter-service APIs are used for sitter jobs and status updates.
};

module.exports = petsitterController;