import 'dotenv/config';
import jwt from 'jsonwebtoken';

// Токен из браузера
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjIsImVtYWlsIjoidGVzdHVzZXJAZXhhbXBsZS5jb20iLCJpYXQiOjE3ODAyNzE3NDgsImV4cCI6MTc4MDg3NjU0OH0.62kW8Utd0UtJtGScbOgB9HNa6y51CQwyNubQa5Xk4zs';

console.log('JWT_SECRET:', process.env.JWT_SECRET);
console.log('Token:', testToken.substring(0, 50) + '...');

try {
    const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
    console.log('✓ Token verified successfully!');
    console.log('Payload:', decoded);
} catch (err) {
    console.error('✗ Token verification failed:', err.message);
}
