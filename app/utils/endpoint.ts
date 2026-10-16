export type Endpoint = {
  scheme: string;
  host: string;
  port: string;
  rest: string;
};

const RE = /^(?:([a-z][a-z0-9+.-]*):\/\/)?([^:/\s]*)(?::(\d*))?(.*)$/i;

export const parseEndpoint = (raw: string): Endpoint => {
  const m = RE.exec(raw.trim()) ?? [];
  return {
    scheme: m[1] ?? '',
    host: m[2] ?? '',
    port: m[3] ?? '',
    rest: m[4] ?? '',
  };
};

export const looksLikeHost = (host: string) =>
  host === 'localhost' ||
  /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
  /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(host);

export const validPort = (port: string) =>
  /^\d{2,5}$/.test(port) && parseInt(port, 10) <= 65535;

export const isCompleteEndpoint = (e: Endpoint) =>
  looksLikeHost(e.host) && validPort(e.port);

export const formatEndpoint = (e: Endpoint) =>
  `${e.host.toLowerCase()}${e.port ? `:${e.port}` : ''}`;

export const normalizeEndpoint = (raw: string) =>
  formatEndpoint(parseEndpoint(raw));

export const endpointUri = (e: Endpoint) =>
  `http://${e.host.toLowerCase()}:${e.port}`;
