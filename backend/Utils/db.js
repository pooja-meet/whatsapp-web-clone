const mongoose = require('mongoose')

connectDb = async () => {
    try {
        const conn = await mongoose.connect(`${process.env.MONGO_URL}`)
        console.log("mongoose is connected successfully", `${conn.connection.name}`);

    } catch (error) {
        console.error("mongoose is not connected", error.message);
        process.exit(1)
    }
}
module.exports = connectDb;