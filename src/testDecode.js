// Adjust the path if board.js is in a different folder
import { decodeRelative7 } from './board.js';

console.log('decodeRelative7(1)  =', decodeRelative7(1));    // Expected: 1
console.log('decodeRelative7(63) =', decodeRelative7(63));   // Expected: 63
console.log('decodeRelative7(64) =', decodeRelative7(64));   // Expected: 0
console.log('decodeRelative7(65) =', decodeRelative7(65));   // Expected: -63
console.log('decodeRelative7(127)=', decodeRelative7(127));  // Expected: -1
