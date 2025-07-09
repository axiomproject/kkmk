
import bcrypt from 'bcryptjs';



export const createUser = async (email: string, password: string) => {
  const hashedPassword = await bcrypt.hash(password, 10);


};
