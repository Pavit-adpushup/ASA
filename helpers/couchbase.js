const { couchbaseConfig } = require('../config');
const couchbase = require("couchbase"),
  Promise = require("bluebird"),
  N1qlQuery = couchbase.N1qlQuery,
  connectedBuckets = {},
  clusters = {};

const connect = (host, bucket, username, userPassword) => {
  let cluster = clusters[host];
  if (!cluster) {
    cluster = new couchbase.Cluster(host, {
      operation_timeout: 5000,
    });
    cluster.authenticate(username, userPassword);
    clusters[host] = cluster;
  }

  const connect = () => {
    return new Promise((resolve, reject) => {
      if (connectedBuckets[bucket]) {
        return resolve(connectedBuckets[bucket]);
      }
      const bucketConn = cluster.openBucket(bucket, (err) => {
        if (err) {
          return reject(err);
        }
      });

      connectedBuckets[bucket] = Promise.promisifyAll(bucketConn);
      resolve(connectedBuckets[bucket]);
    });
  };
  

  const queryDB = async (query) => {
    return connect()
      .then((bucket) => bucket.queryAsync(N1qlQuery.fromString(query)))
      .catch((e) => {
        console.log(e);
      });
  };

  const getDoc = (docId) => {
    return connect()
      .then((bucket) => bucket.getAsync(docId))
      .then((res) => res)
      .catch((ex) => {
        if (ex.code === 12) {
          throw new Error(`Doc with id ${docId} not found`);
        }

        throw new Error(ex.message);
      });
  };

  const getDocAndCreateIfNotExists = (docId, defaultValue = {}) => {
    return getDoc(docId)
      .catch((ex) => {
        if (ex.code === 13) {
          // doc doesn't exist. Create Doc
          return createDoc(docId, defaultValue, {});
        }
        throw new Error(ex);
      })
      .then(() => {
        // get the doc contents once it's created
        return getDoc(docId);
      })
      .catch((ex) => {
        throw new Error(ex.message);
      });
  };

  const createDoc = (key, json, option) => {
    return connect()
      .then((bucket) => {
        json.dateCreated = +new Date();
        return bucket.insertAsync(key, json, option);
      })
      .catch((ex) => {
        throw new Error(ex.message);
      });
  };

  const updateDoc = (docId, doc, cas) => {
    if (cas) {
      return connect().then((bucket) =>
        bucket.replaceAsync(docId, doc, { cas: cas })
      );
    }
    return connect().then((bucket) => bucket.upsertAsync(docId, doc));
  };

  return {
    queryDB,
    getDoc,
    getDocAndCreateIfNotExists,
    createDoc,
    updateDoc,
  };
};

const getConnection = () =>
  connect(
    couchbaseConfig.server,
    couchbaseConfig.bucket,
    couchbaseConfig.user,
    couchbaseConfig.password
  );

module.exports = {
  connect,
  getConnection,
};
