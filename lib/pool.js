const delayBatch = (delay) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, delay);
  });
};

const requestPool = (poolConfig) => {
  const { queue = [], batchSize = 1, delay = 500, fn } = poolConfig;

  let batchList = [];
  for (let i = 0; i < queue.length; i = i + batchSize) {
    let batch = [];
    const end = queue.length > i + batchSize ? i + batchSize : queue.length;
    for (let j = i; j < end; j++) {
      batch.push(queue[j]);
    }
    // list of batches
    batchList.push(batch);
  }

  // promise loop using reducer method
  const reducerPromise = batchList.reduce((promiseAcc, batch, index) => {
    return promiseAcc.then(async (resAll) => {
      await delayBatch(delay);
      let callbackArr = batch.map((batchItem) => fn(batchItem));
      return Promise.all(callbackArr)
        .then((res) => {
          resAll.res = resAll.res.concat(res);
          return resAll;
        })
        .catch((err) => {
          console.log("Error in Req Pool:", err);
          const { config = {} } = err;
          resAll.err = resAll.err.concat(config.url);
          return resAll;
        });
    });
  }, Promise.resolve({ res: [], err: [] }));

  return reducerPromise
    .then((allRes) => {
      return allRes;
    })
    .catch((err) => {
      throw err;
    });
};

module.exports = {
  requestPool,
};
