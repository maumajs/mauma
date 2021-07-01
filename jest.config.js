module.exports = {
  testEnvironment: 'node',
  verbose: true,
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc-node/jest'],
  },
}
