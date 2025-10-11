// User Controller

const userController = {
    // View controllers
    getUserMain: (req, res) => {
        res.render('user/main', { title: 'Welcome to PetEz', activeMenu: 'home' });
    },
    getUserProfile: (req, res) => {
        res.render('user/profile', { title: 'User Profile', activeMenu: 'profile' });
    },

    getUserBookings: (req, res) => {
        res.render('user/booking', { title: 'My Bookings', activeMenu: 'bookings' });
    },

    getUserHistory: (req, res) => {
        res.render('user/history', { title: 'Booking History', activeMenu: 'history' });
    },

    getBookingForm: (req, res) => {
        const petsitterId = req.params.id;
        res.render('user/booking', { title: 'Book Pet Sitter', petsitterId });
    },
};

module.exports = userController;