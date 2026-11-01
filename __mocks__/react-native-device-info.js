export const getSystemName = jest.fn(() => 'Mocked System Name');
export const getSystemVersion = jest.fn(() => 'Mocked System Version');
export const getManufacturer = jest.fn(() => 'Mocked Manufacturer');
export const getModel = jest.fn(() => 'Mocked Model');
export const getVersion = jest.fn(() => '0.0.0');
export const getBuildNumber = jest.fn(() => '0');

export default {
  getSystemName,
  getSystemVersion,
  getManufacturer,
  getModel,
  getVersion,
  getBuildNumber,
};
