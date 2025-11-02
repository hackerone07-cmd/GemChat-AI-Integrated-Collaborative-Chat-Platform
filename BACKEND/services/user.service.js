import User from "../models/user.model.js";

export const createUser = async ({ email, password }) => {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }
  const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{8,}$/;

  if (!passwordRegex.test(password)) {
    throw new Error('Password must be at least 8 characters and include a number and a special character');
  }



  const user = await User.create({ email, password });
  return user;
};

export const getAllUsers = async ({userId})=>{
    const users = await User.find({
      _id: {$ne: userId}
    });
    return users
}