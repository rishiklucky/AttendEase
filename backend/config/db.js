import mongoose from 'mongoose';
import dns from 'dns';

export let isMongoConnected = false;

// Configure Node to use Google DNS for SRV query resolution
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (dnsErr) {
  console.warn('Could not override DNS servers:', dnsErr.message);
}

/**
 * Resolves a mongodb+srv:// URI to a standard mongodb:// URI by performing
 * DNS SRV queries programmatically using Google DNS.
 * Bypasses local network/ISP DNS blocking of SRV records.
 */
const resolveSrvToStandardUri = (srvUri) => {
  return new Promise((resolve) => {
    if (!srvUri.startsWith('mongodb+srv://')) {
      return resolve(srvUri);
    }

    try {
      const parts = srvUri.replace('mongodb+srv://', '').split('@');
      if (parts.length !== 2) {
        return resolve(srvUri);
      }

      const credentials = parts[0];
      const rest = parts[1];
      const hostAndDb = rest.split('/');
      const srvHost = hostAndDb[0];
      const dbAndOptions = hostAndDb[1] || '';
      
      const dbName = dbAndOptions.split('?')[0] || '';
      const optionsStr = dbAndOptions.split('?')[1] || '';

      dns.resolveSrv(`_mongodb._tcp.${srvHost}`, (err, addresses) => {
        if (err || !addresses || addresses.length === 0) {
          console.warn('Programmatic SRV DNS lookup failed, falling back to original URI:', err?.message || 'No records');
          return resolve(srvUri);
        }

        const hosts = addresses.map((addr) => `${addr.name}:${addr.port}`).join(',');
        
        let finalOptions = optionsStr;
        if (!finalOptions.includes('ssl=')) {
          finalOptions += (finalOptions ? '&' : '') + 'ssl=true';
        }
        if (!finalOptions.includes('authSource=')) {
          finalOptions += (finalOptions ? '&' : '') + 'authSource=admin';
        }

        const standardUri = `mongodb://${credentials}@${hosts}/${dbName}?${finalOptions}`;
        resolve(standardUri);
      });
    } catch (e) {
      console.warn('Error parsing SRV URI, falling back to original:', e.message);
      resolve(srvUri);
    }
  });
};

const connectDB = async () => {
  try {
    let connectionUri = process.env.MONGODB_URI;

    if (connectionUri && connectionUri.startsWith('mongodb+srv://')) {
      console.log('Resolving MongoDB Atlas DNS SRV records programmatically...');
      connectionUri = await resolveSrvToStandardUri(connectionUri);
    }

    // Set a short timeout (3 seconds) for quick connection failure feedback
    const conn = await mongoose.connect(connectionUri, {
      serverSelectionTimeoutMS: 3000
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    isMongoConnected = true;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.log('\n================================================================');
    console.log('⚠️  WARNING: Could not connect to MongoDB database.');
    console.log('⚠️  FALLBACK: Running with IN-MEMORY DATA STORAGE.');
    console.log('⚠️  Note: Data will be reset when the server restarts.');
    console.log('⚠️  To persist data, configure a valid MONGODB_URI in backend/.env');
    console.log('================================================================\n');
    isMongoConnected = false;
  }
};

export default connectDB;
