const pino = require('pino');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';
const level = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

let transport;

if (isProduction) {
  // Production: JSON output to stdout
  transport = pino.transport({
    target: 'pino/file',
    options: { destination: 1 }, // stdout
  });
} else {
  // Development: pretty-print to console + file
  transport = pino.transport({
    targets: [
      {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
        level,
      },
      {
        target: 'pino/file',
        options: {
          destination: path.join(__dirname, '..', 'logs', 'app.log'),
          mkdir: true,
        },
        level,
      },
    ],
  });
}

const logger = pino({
  level,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
}, transport);

module.exports = logger;
