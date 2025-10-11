// User Controller

const userController = {
    // View controllers
    getUserMain: (req, res) => {
        const user = req.session.user;
        res.render('user/main', { title: 'Welcome to PetEz', activeMenu: 'home', user: user });
    },
    getUserProfile: async (req, res) => {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/');
        }

        try {
            // Fetch fresh user data from the auth service
            const authApiUrl = 'http://localhost:3002/profile';
            const response = await fetch(authApiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${req.session.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Update session with fresh data
                req.session.user = {
                    ...req.session.user,
                    ...data.user,
                    id: data.user.user_id // Ensure consistent ID field
                };
                res.render('user/profile', { title: 'User Profile', activeMenu: 'profile', user: data.user });
            } else {
                // Fallback to session data if API call fails
                console.error('Failed to fetch fresh profile data, using session data');
                res.render('user/profile', { title: 'User Profile', activeMenu: 'profile', user: user });
            }
        } catch (error) {
            console.error('Error fetching profile data:', error);
            // Fallback to session data if API call fails
            res.render('user/profile', { title: 'User Profile', activeMenu: 'profile', user: user });
        }
    },

    getUserBookings: (req, res) => {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/');
        }
        res.render('user/booking', { title: 'My Bookings', activeMenu: 'bookings', user: user });
    },

    getUserHistory: (req, res) => {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/');
        }
        res.render('user/history', { title: 'Booking History', activeMenu: 'history', user: user });
    },

    getBookingForm: (req, res) => {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/');
        }
        const petsitterId = req.params.id;
        res.render('user/booking', { title: 'Book Pet Sitter', petsitterId, user: user });
    },

    // Profile management endpoints
    getEditProfile: (req, res) => {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/');
        }
        res.render('user/edit-profile', { title: 'Edit Profile', activeMenu: 'profile', user: user });
    },

    updateProfile: async (req, res) => {
        const user = req.session.user;
        if (!user) {
            // Check if it's an AJAX request
            if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
                return res.status(401).json({ message: 'Authentication required' });
            }
            return res.redirect('/');
        }

        const {
            username,
            firstName,
            lastName,
            age,
            phone,
            address,
            district,
            province,
            postalCode
        } = req.body;

        try {
            const authApiUrl = 'http://localhost:3002/profile/update';
            const response = await fetch(authApiUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${req.session.token}`
                },
                body: JSON.stringify({
                    username,
                    firstName,
                    lastName,
                    age,
                    phone,
                    address,
                    district,
                    province,
                    postalCode
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Update failed' }));
                
                // Check if it's an AJAX request
                if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
                    return res.status(response.status).json({ message: errorData.message || 'Profile update failed' });
                }
                return res.status(400).send(errorData.message || 'Profile update failed');
            }

            const data = await response.json();
            // Update session with new user data
            req.session.user = {
                ...req.session.user,
                username: data.user.username,
                full_name: data.user.full_name,
                age: data.user.age,
                phone: data.user.phone,
                address: data.user.address,
                district: data.user.district,
                province: data.user.province,
                postal_code: data.user.postal_code
            };
            
            // Check if it's an AJAX request
            if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
                return res.status(200).json({ message: 'Profile updated successfully', user: data.user });
            }
            res.redirect('/user/profile?success=1');
        } catch (error) {
            console.error('Network or server error during profile update:', error);
            
            // Check if it's an AJAX request
            if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
                return res.status(500).json({ message: 'Internal server error during profile update' });
            }
            res.status(500).send('Internal server error during profile update.');
        }
    },

    changePassword: async (req, res) => {
        const user = req.session.user;
        if (!user) {
            // Check if it's an AJAX request
            if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
                return res.status(401).json({ message: 'Authentication required' });
            }
            return res.redirect('/');
        }

        const { currentPassword, newPassword } = req.body;

        console.log('Password change request:', req.body);

        if (!currentPassword || !newPassword) {
            // Check if it's an AJAX request
            if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
                return res.status(400).json({ message: 'Current password and new password are required' });
            }
            return res.status(400).send('Current password and new password are required.');
        }

        if (newPassword.length < 6) {
            // Check if it's an AJAX request
            if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
                return res.status(400).json({ message: 'New password must be at least 6 characters long' });
            }
            return res.status(400).send('New password must be at least 6 characters long.');
        }

        try {
            const authApiUrl = 'http://localhost:3002/profile/change-password';
            const response = await fetch(authApiUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${req.session.token}`
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Password change failed' }));
                
                // Check if it's an AJAX request
                if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
                    return res.status(response.status).json({ message: errorData.message || 'Password change failed' });
                }
                return res.status(400).send(errorData.message || 'Password change failed');
            }

            // Check if it's an AJAX request
            if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
                return res.status(200).json({ message: 'Password changed successfully' });
            }
            res.redirect('/user/profile?password_changed=1');
        } catch (error) {
            console.error('Network or server error during password change:', error);
            
            // Check if it's an AJAX request
            if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
                return res.status(500).json({ message: 'Internal server error during password change' });
            }
            res.status(500).send('Internal server error during password change.');
        }
    },

    // Pet management methods
    getPets: async (req, res) => {
        const user = req.session.user;
        if (!user) {
            if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
                return res.status(401).json({ message: 'Authentication required' });
            }
            return res.redirect('/');
        }

        try {
            const authApiUrl = 'http://localhost:3002/pets';
            const response = await fetch(authApiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${req.session.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return res.status(200).json(data);
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Failed to fetch pets' }));
                return res.status(response.status).json({ message: errorData.message || 'Failed to fetch pets' });
            }
        } catch (error) {
            console.error('Error fetching pets:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    addPet: async (req, res) => {
        const user = req.session.user;
        if (!user) {
            if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
                return res.status(401).json({ message: 'Authentication required' });
            }
            return res.redirect('/');
        }

        try {
            const authApiUrl = 'http://localhost:3002/pets';
            const response = await fetch(authApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${req.session.token}`
                },
                body: JSON.stringify(req.body)
            });

            if (response.ok) {
                const data = await response.json();
                return res.status(201).json(data);
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Failed to add pet' }));
                return res.status(response.status).json({ message: errorData.message || 'Failed to add pet' });
            }
        } catch (error) {
            console.error('Error adding pet:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    updatePet: async (req, res) => {
        const user = req.session.user;
        if (!user) {
            if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
                return res.status(401).json({ message: 'Authentication required' });
            }
            return res.redirect('/');
        }

        try {
            const petId = req.params.id;
            const authApiUrl = `http://localhost:3002/pets/${petId}`;
            const response = await fetch(authApiUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${req.session.token}`
                },
                body: JSON.stringify(req.body)
            });

            if (response.ok) {
                const data = await response.json();
                return res.status(200).json(data);
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Failed to update pet' }));
                return res.status(response.status).json({ message: errorData.message || 'Failed to update pet' });
            }
        } catch (error) {
            console.error('Error updating pet:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    deletePet: async (req, res) => {
        const user = req.session.user;
        if (!user) {
            if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
                return res.status(401).json({ message: 'Authentication required' });
            }
            return res.redirect('/');
        }

        try {
            const petId = req.params.id;
            const authApiUrl = `http://localhost:3002/pets/${petId}`;
            const response = await fetch(authApiUrl, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${req.session.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return res.status(200).json(data);
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Failed to delete pet' }));
                return res.status(response.status).json({ message: errorData.message || 'Failed to delete pet' });
            }
        } catch (error) {
            console.error('Error deleting pet:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    },
};

module.exports = userController;