import dbClient from "../utils/db";
import sha1 from 'sha1';

const UsersController = {
  async postNew(request, response) {
    try {
      const { email, password } = request.body;

      // check if user entered email and password:
      if (!email) {
        return response.status(400).json({ error: 'Missing email' });
      }
      if (!password) {
        return response.status(400).json({ error: 'Missing password' });
      }

      // check if email already exists:
      const existingUser = await dbClient.users.findOne({ email });
      if (existingUser) {
        return response.status(400).json({ error: 'Email already exists' });
      }

      const hashedPassword = sha1(password);

      const newUser = await dbClient.users.insertOne({
        email,
        password: hashedPassword,
      });
      const userResponse = {
        email: newUser.ops[0].email,
        id: newUser.ops[0]._id,
      }
      return response.status(201).json(userResponse);
    } catch (error) {
      console.error('Error in postNew:', error);
      return response.status(500).json({ error: 'Internal Server Error '});
    }
  }
};

module.exports = UsersController;
