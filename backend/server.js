require("dotenv").config();
const connectDB = require("./src/config/database");
const app = require("./app");

const port = process.env.PORT || 4000;

(async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (err) {
    console.error("Server failed to start", err);
  }
})();
