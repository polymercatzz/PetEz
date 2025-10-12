// Pet Sitter Controller
const axios = require('axios');

const petsitterController = {
    // View controllers
    getPetsitterProfile: (req, res) => {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/');
        }
        res.render('petsitter/profile', { title: 'Pet Sitter Profile', user: user });
    },

    getPetsitterRegister: (req, res) => {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/');
        }
        res.render('petsitter/register', { title: 'Become a Pet Sitter', user: user });
    },

    getAvailableJobs: (req, res) => {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/');
        }
        res.render('petsitter/jobs', { title: 'Available Jobs', user: user });
    },

    getJobHistory: (req, res) => {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/');
        }
        res.render('petsitter/history', { title: 'Job History', user: user });
    },

    getWorkDetail: (req, res) => {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/');
        }
        const jobId = req.params.id;
        res.render('petsitter/work_detail', { title: 'Job Details', jobId, user: user });
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
            } else {
                console.error('Error accepting job:', error);
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

    getPetsitterBookings: async (req, res) => {
        try {
            // Get petsitter's accepted bookings
            const user = req.session.user;
            if (!user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            const bookingApiUrl = `http://booking-service:3006/sitter/${user.id}/bookings`;
            const response = await fetch(bookingApiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${req.session.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                res.json(data);
            } else {
                console.error('Failed to fetch petsitter bookings:', response.status);
                res.json({ bookings: [] });
            }
        } catch (error) {
            console.error('Error fetching petsitter bookings:', error);
            res.status(500).json({ error: error.message });
        }
    },

    updateBookingStatus: async (req, res) => {
        try {
            const bookingId = req.params.id;
            const { status } = req.body;
            const user = req.session.user;
            
            if (!user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            // Update booking status in booking service
            const bookingApiUrl = `http://booking-service:3006/bookings/${bookingId}/status`;
            const response = await fetch(bookingApiUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${req.session.token}`
                },
                body: JSON.stringify({
                    status: status,
                    sitter_id: user.id
                })
            });

            if (response.ok) {
                const data = await response.json();
                res.json({ message: 'Booking status updated successfully', booking: data.booking });
            } else {
                const errorData = await response.json();
                res.status(response.status).json({ message: errorData.message || 'Failed to update booking status' });
            }
        } catch (error) {
            console.error('Error updating booking status:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = petsitterController;