import { criarServidor } from './servidor.js';
import { config } from '../config.js';

const servidor = criarServidor();
servidor.listen(config.port, config.host, () => {
  // eslint-disable-next-line no-console
  console.log(`Landing no ar em http://${config.host}:${config.port} (preview=${config.preview})`);
});
