module.exports = {
    //Intro
    //Tavic-CI and local DEV doesn't contain any vars, so both will use localhost:8080 and local MongoDB. Heroku will use it's own services via process.env
    //Database
    db_name: process.env.DB_NAME || "peon",
    mongodb_url: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/peon",    
    //mongodb_url: "mongodb://heroku:255320@ds255309.mlab.com:55309/heroku_wnpqsn45",    
    //Application
    port: process.env.PORT || 8080,
    test_host: "http://localhost:8080/v1.0",    
    user: "test",
    debugMode: true    
  };