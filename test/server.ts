import handler from 'serve-handler';
import { createServer } from 'http';
import path from 'path';

const server = createServer((request: any, response: any) => {
  return handler(request, response, {
    public: path.join(__dirname, 'server_root'),
  });
});

export function start(port: number, cb: (...args: any[]) => any) {
  console.log('starting server');
  server.listen(port, (...args: any[]) => {
    console.log('started server');
    cb(...args);
  });
}
export function stop(cb: (...args: any[]) => any) {
  console.log('stopped server');
  server.close((...args: any[]) => {
    console.log('stopped server');
    cb(...args);
  });
}
