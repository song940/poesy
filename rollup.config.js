import babel from 'rollup-plugin-babel';
import replace from 'rollup-plugin-replace';
import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve';

module.exports = {
  input: 'src/main.jsx',
  plugins: [
    resolve(),
    babel({
      exclude: 'node_modules/**'
    }),
    commonjs(),
    replace({ 'process.env.NODE_ENV': JSON.stringify( 'production' ) })
  ],
  output: {
    file: 'js/app.js',
    format: 'iife'
  }
};