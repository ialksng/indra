import mongoose from 'mongoose';

const indraDb = mongoose.createConnection(process.env.INDRA_MONGO_URI);

indraDb.on('connected', () => {
  console.log('✅ [Indra DB] Successfully connected to dedicated Indra database');
});

indraDb.on('error', (err) => {
  console.error('❌ [Indra DB] Connection error:', err);
});

export default indraDb;