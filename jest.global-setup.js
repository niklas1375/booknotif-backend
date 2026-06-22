module.exports = async () => {
  // Set environment variables before any modules are loaded
  process.env.NODE_ENV = 'test';
  process.env.DB_PATH = ':memory:';
};