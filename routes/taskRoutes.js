const express = require("express");
const router = express.Router();

const taskController = require("../controllers/taskController");
const auth = require("../middleware/authMiddleware");
// post routes
router.post("/addTask", auth, taskController.addTask);
router.get("/getTasks", auth, taskController.getTasks);
router.delete("/delete/:id", auth, taskController.deleteTask);
router.put("/update/:id", auth, taskController.updateTask);

module.exports = router;
