// Replaced at build time by webpack's DefinePlugin (see webpack.config.js)
declare const process: {
  env: {
    version: string;
    NODE_ENV: string;
  };
};

// Stylesheets, injected by webpack's style-loader
declare module '*.css';
