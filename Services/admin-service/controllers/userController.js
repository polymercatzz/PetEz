
const userController = {
    getAllUsers: async (req, res) => {
        let users = [];
        const url = 'http://localhost:3002/users';
        try {
            const response = await fetch(url);
            users = await response.json();
            return res.status(200).json(users);
        } catch (error) {
            console.error('Error fetching users:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
};
module.exports = userController;