import bcrypt from 'bcryptjs';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: 'superadmin' | 'editor' | 'author';
}

export interface LoginResult {
  success: boolean;
  user?: AdminUser;
  error?: string;
}

// TODO: Thay bằng DB query khi có mysql2 pool
const MOCK_ADMIN: AdminUser = {
  id: 1,
  username: 'admin',
  email: 'admin@pipsnote.local',
  role: 'superadmin',
};

const MOCK_PASSWORD_HASH = bcrypt.hashSync('admin123', 10); // Default password

export async function verifyLogin(
  username: string,
  password: string
): Promise<LoginResult> {
  // TODO: Query từ admin_users table
  // const [rows] = await pool.query('SELECT * FROM admin_users WHERE username = ?', [username]);

  if (username !== MOCK_ADMIN.username) {
    return { success: false, error: 'Invalid username or password' };
  }

  const isValid = await bcrypt.compare(password, MOCK_PASSWORD_HASH);
  if (!isValid) {
    return { success: false, error: 'Invalid username or password' };
  }

  return { success: true, user: MOCK_ADMIN };
}

export function generateToken(user: AdminUser): string {
  // TODO: Implement JWT khi có JWT_SECRET
  // Tạm dùng simple base64
  return Buffer.from(JSON.stringify(user)).toString('base64');
}

export function verifyToken(token: string): AdminUser | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    return JSON.parse(decoded) as AdminUser;
  } catch {
    return null;
  }
}
