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
            // Pet sitter registration logic
            const petsitterData = req.body;
            res.json({ message: 'Pet sitter registered successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getPetsitterProfileData: async (req, res) => {
        try {
            // Get pet sitter profile logic
            res.json({ message: 'Get pet sitter profile' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    updatePetsitterProfile: async (req, res) => {
        try {
            // Update pet sitter profile logic
            const profileData = req.body;
            res.json({ message: 'Profile updated successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getJobs: async (req, res) => {
        try {
            // Fetch available jobs from booking service
            const bookingApiUrl = 'http://booking-service:3006/jobs/available';
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
                console.error('Failed to fetch available jobs:', response.status);
                res.json({ jobs: [] });
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
            res.status(500).json({ error: error.message });
        }
    },

    acceptJob: async (req, res) => {
        try {
            const jobId = req.params.id;
            const user = req.session.user;
            
            if (!user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            // Accept job in booking service
            const bookingApiUrl = `http://booking-service:3006/bookings/${jobId}/accept`;
            const response = await fetch(bookingApiUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${req.session.token}`
                },
                body: JSON.stringify({
                    sitter_id: user.id
                })
            });

            if (response.ok) {
                const data = await response.json();
                res.json({ message: 'Job accepted successfully', booking: data.booking });
            } else {
                const errorData = await response.json();
                res.status(response.status).json({ message: errorData.message || 'Failed to accept job' });
            }
        } catch (error) {
            console.error('Error accepting job:', error);
            res.status(500).json({ error: error.message });
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