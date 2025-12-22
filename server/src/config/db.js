const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Fix: Drop old unique phone index if it exists (migration)
    try {
      const collection = conn.connection.collection('users');
      const indexes = await collection.indexes();
      const phoneIndex = indexes.find(idx => idx.key && idx.key.phone && idx.unique);
      if (phoneIndex) {
        await collection.dropIndex(phoneIndex.name);
        console.log('✅ Dropped old unique phone index');
      }
    } catch (indexErr) {
      // Index might not exist, that's fine
      if (!indexErr.message.includes('index not found')) {
        console.log('Index migration note:', indexErr.message);
      }
    }

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
