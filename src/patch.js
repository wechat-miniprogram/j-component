const CONSTANT = require('./constant');

class Patch {
    constructor(type, newVirtualNode, change) {
        this.type = type;
        this.newVirtualNode = newVirtualNode;
        this.change = change;
    }

    /**
     * apply patch into exparser node
     */
    apply(exparserNode) {
        let change = this.change;
        let parent = exparserNode.parentNode;
        let newVirtualNode = this.newVirtualNode;
        let newExparserNode;

        switch(this.type) {
            case CONSTANT.PATCH_REPLACE:
                newExparserNode = change.render(null, parent && parent.ownerShadowRoot);
                if (parent) parent.replaceChild(newExparserNode, exparserNode);
                break;
            case CONSTANT.PATCH_ATTRS:
                newVirtualNode.setAttrs(exparserNode);
                break;
            case CONSTANT.PATCH_REORDER:
                let { removes, inserts } = change;
                let children = exparserNode.childNodes;
                let newChildren = this.newVirtualNode.children;

                inserts = inserts.map(({ oldIndex, index }) => {
                    return { 
                        newExparserNode: children[oldIndex] || newChildren[index].render(null, exparserNode.ownerShadowRoot),
                        index,
                    };
                });

                removes.forEach(index => exparserNode.removeChild(children[index]));
                inserts.forEach(({ newExparserNode, index }) => exparserNode.insertBefore(newExparserNode, children[index]));
                break;
            case CONSTANT.PATCH_INSERT:
                newExparserNode = change.render(null, parent && parent.ownerShadowRoot);
                exparserNode.appendChild(newExparserNode);
                break;
            case CONSTANT.PATCH_REMOVE:
                if (parent) parent.removeChild(exparserNode);
                break;
        }
    }

    /**
     * get apply function 
     */
    static getApply(virtualTree, patches) {
        let indexList = Object.keys(patches).map(index => +index).sort();
        let isInRange = (indexList, left, right) => {
            let min = 0;
            let max = indexList.length - 1;

            while (min <= max) {
                let middle = (max + min) >> 1;
                let middleIndex = indexList[middle];

                if (middleIndex < left) {
                    min = middle + 1;
                } else if (middleIndex > right) {
                    max = middle - 1;
                } else {
                    return true;
                }
            }
            return false;
        }
        let mapIndex = (exparserNode, virtualNode, indexList, indexMap, index) => {
            if (exparserNode) {
                if (indexList.indexOf(index) >= 0) indexMap[index] = exparserNode;

                virtualNode.children.forEach((vChild, i) => {
                    let nextIndex = (++index) + vChild.childCount;

                    if (isInRange(indexList, index, nextIndex)) mapIndex(exparserNode.childNodes[i], vChild, indexList, indexMap, index);

                    index = nextIndex;
                });
            }
        };

        return exparserTree => {
            if (!indexList.length) return exparserTree;

            let indexMap = {}; // index-exparserNode map

            mapIndex(exparserTree, virtualTree, indexList, indexMap, 0);
            indexList.forEach(index => {
              let exparserNode = indexMap[index];
              if (exparserNode && patches[index]) patches[index].forEach(patch => patch.apply(exparserNode));
            });
        };
    }
}

module.exports = Patch;
