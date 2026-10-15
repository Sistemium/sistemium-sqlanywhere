const childProcess = require('child_process');

/**
 * Records every process forked until restore() is called
 */

function trackForks() {

  const forked = [];
  const { fork } = childProcess;

  childProcess.fork = (...args) => {
    const child = fork(...args);
    forked.push(child);
    return child;
  };

  forked.restore = () => {
    childProcess.fork = fork;
  };

  return forked;

}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code !== 'ESRCH';
  }
}

/**
 * Resolves when the forked child has exited, rejects if it is still running after timeout
 */

function exited(child, timeout = 1000) {

  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Child process ${child.pid} is still running`));
    }, timeout);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });

}

/**
 * Same for a process which is not our child, so there is no 'exit' event to wait for
 */

async function pidExited(pid, timeout = 3000) {

  const until = Date.now() + timeout;

  while (isAlive(pid)) {
    if (Date.now() > until) {
      throw new Error(`Process ${pid} is still running`);
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }

}

module.exports = {
  trackForks,
  isAlive,
  exited,
  pidExited,
};
