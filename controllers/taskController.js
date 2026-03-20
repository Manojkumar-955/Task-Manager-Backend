const db = require("../config/db");

const addTask = async (req, res) => {
  try {
    const { title, description, status } = req.body;
    const user_id = req.userId;
    const query = "INSERT INTO tasks (user_id,title,status) VALUES (?,?,?)";
    const [result] = await db.query(query, [user_id, title, status]);
    if (result) {
      const newTask = {
        id: result.insertId,
        user_id,
        title,
        status,
      };

      res
        .status(201)
        .json({ message: "Task added successfully", task: newTask });
    }
  } catch (error) {
    res.status(500).json({ message: "Error adding task" });
  }
};

const getTasks = async (req, res) => {
  const userId = req.userId;
  console.log(userId);
  try {
    const query = "select * from tasks where user_id=?";
    const [rows] = await db.query(query, [userId]);
    console.log(rows);
    res.json({ message: "Tasks retrivewed successfully", tasks: rows });
  } catch (error) {
    res.status(500).json({ message: "Error fetching tasks" });
  }
};

const deleteTask = async (req, res) => {
  const { id } = req.params;
  try {
    const query = "delete from tasks where id=?";
    const [result] = await db.query(query, [id]);
    if (result.affectedRows > 0) {
      res.status(201).json({ message: "Task deleted successfully" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error deleting task" });
  }
};

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status } = req.body;

    // Validate task ID
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    // Validate that at least one field is provided
    if (!title && !description && !status) {
      return res
        .status(400)
        .json({ message: "At least one field is required to update" });
    }

    // Validate status if provided
    const validStatuses = ["Pending", "in-progress", "completed"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Validate title length if provided
    if (title && title.trim().length === 0) {
      return res.status(400).json({ message: "Title cannot be empty" });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];

    if (title) {
      updates.push("title=?");
      values.push(title.trim());
    }
    if (description) {
      updates.push("description=?");
      values.push(description.trim());
    }
    if (status) {
      updates.push("status=?");
      values.push(status);
    }

    updates.push("updated_at=NOW()");
    values.push(id);

    const query = `UPDATE tasks SET ${updates.join(", ")} WHERE id=?`;
    console.log("query:", query);
    const [result] = await db.query(query, values);

    // Check if task was found and updated
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({
      message: "Task updated successfully",
      taskId: id,
    });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ message: "Error updating task" });
  }
};

module.exports = { addTask, getTasks, deleteTask, updateTask };
