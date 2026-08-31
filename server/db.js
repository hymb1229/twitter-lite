// Simple in-memory database
const users = [];
const posts = [];
const likes = [];
const comments = [];
const follows = [];
const liveRooms = [];

module.exports = { 
  users, posts, likes, comments, follows, liveRooms,
  query: (sql, params) => {
    // Simple mock query for compatibility
    return { rows: [], rowCount: 0 };
  }
};
