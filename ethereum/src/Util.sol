pragma solidity ^0.5.13;
library Util {

    function concat(string memory _a, string memory _b, string memory _c) public pure returns (string memory){
        bytes memory _ba = bytes(_a);
        bytes memory _bb = bytes(_b);
        bytes memory _bc = bytes(_c);
        string memory abcde = new string(_ba.length + _bb.length + _bc.length);
        bytes memory babcde = bytes(abcde);
        uint k = 0;
        for (uint i = 0; i < _ba.length; i++) babcde[k++] = _ba[i];
        for (uint i = 0; i < _bb.length; i++) babcde[k++] = _bb[i];
        for (uint i = 0; i < _bc.length; i++) babcde[k++] = _bc[i];
        return string(babcde);
    }
    
    function concat(string memory _a, string memory _b) public pure returns (string memory) {
        return concat(_a, _b, "");
    }
    
}

