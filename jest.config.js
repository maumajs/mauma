module.exports = {
  testEnvironment: 'node',
  verbose: true,
  transform: {
    '^.+\\.(t|j)sx?$': ['esbuild-jest'],
  },
}
