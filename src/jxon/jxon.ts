import { isNumber } from 'util';

export class EmptyTree {
  public toString() {
    return '';
  }

  public valueOf() {
    return null;
  }
}

export class Jxon {

  public static readonly CDATA = 4;
  public static readonly TEXT = 3;
  public static readonly ELEMENT = 1;

  private opts = {
    valueKey:            '_',
    attrKey:             '$',
    attrPrefix:          '$',
    lowerCaseTags:       false,
    trueIsEmpty:         false,
    autoDate:            false,
    ignorePrefixedNodes: false,
    parseValues:         false
  };

  public config(opts) {
    this.opts = opts;
  }

  public stringToJs(str: string): any {
    return this.xmlToJs(this.stringToXml(str));
  }

  public jsToString(oObjTree: any, sNamespaceURI?: string, sQualifiedName?: string, oDocumentType?: DocumentType): string {
    return this.xmlToString(this.jsToXml(oObjTree, sNamespaceURI, sQualifiedName, oDocumentType));
  }

  private parseText(sValue) {

    const rIsNull = /^\s*$/;
    const rIsBool = /^(?:true|false)$/i;

    if (!this.opts.parseValues) {
      return sValue;
    }
    if (rIsNull.test(sValue)) {
      return null;
    }
    if (rIsBool.test(sValue)) {
      return sValue.toLowerCase() === 'true';
    }
    if (isFinite(sValue)) {
      return parseFloat(sValue);
    }
    if (this.opts.autoDate && isFinite(Date.parse(sValue))) {
      return new Date(sValue);
    }
    return sValue;
  }

  private createObjTree(oParentNode, aCache: any[]) {
    const nLevelStart = aCache.length;
    const hasAttributes = oParentNode.nodeType === oParentNode.ELEMENT_NODE && oParentNode.hasAttributes();

    let sCollectedTxt = '';
    let vResult: any = this.opts.trueIsEmpty ? true : '';

    if (oParentNode.hasChildNodes()) {
      for (let nItem = 0; nItem < oParentNode.childNodes.length; nItem++) {
        const oNode = oParentNode.childNodes.item(nItem);
        if (oNode.nodeType === Jxon.CDATA) {
          sCollectedTxt += oNode.nodeValue;
        } else if (oNode.nodeType === Jxon.TEXT) {
          sCollectedTxt += oNode.nodeValue.trim();
        } else if (oNode.nodeType === Jxon.ELEMENT && !(this.opts.ignorePrefixedNodes && oNode.prefix)) {
          aCache.push(oNode);
        }
        /* nodeType is "Element" (1) */
      }
    }

    const nLevelEnd = aCache.length;
    const vBuiltVal = this.parseText(sCollectedTxt);

    if (oParentNode.hasChildNodes() || hasAttributes) {
      vResult = {};
    }

    let nLength = 0;

    for (let nElId = nLevelStart; nElId < nLevelEnd; nElId++) {

      let sProp = aCache[nElId].nodeName;
      if (this.opts.lowerCaseTags) {
        sProp = sProp.toLowerCase();
      }
      const vContent = this.createObjTree(aCache[nElId], aCache);
      if (vResult.hasOwnProperty(sProp)) {
        if (vResult[sProp].constructor !== Array) {
          vResult[sProp] = [vResult[sProp]];
        }
        vResult[sProp].push(vContent);
      } else {
        vResult[sProp] = vContent;
        nLength++;
      }
    }

    if (hasAttributes) {
      const oAttrParent = vResult;

      for (let nAttrib = 0; nAttrib < oParentNode.attributes.length; nAttrib++) {
        const oAttrib = oParentNode.attributes.item(nAttrib);
        if (this.opts.lowerCaseTags) {
          oAttrib.name = oAttrib.name.toLowerCase();
        }
        oAttrParent[this.opts.attrPrefix + oAttrib.name] = this.parseText(oAttrib.value.trim());
        nLength++;
      }
    }

    if (sCollectedTxt) {
      if (nLength > 0) {
        vResult[this.opts.valueKey] = vBuiltVal;
      } else if (nLength === 0) {
        vResult = vBuiltVal;
      }
    }
    aCache.length = nLevelStart;
    return vResult;
  }

  private loadObjTree(oXMLDoc: Document, oParentEl, oParentObj) {

    if (oParentObj.constructor === String || oParentObj.constructor === Number || oParentObj.constructor === Boolean) {
      oParentEl.appendChild(oXMLDoc.createTextNode(oParentObj.toString()));
      if (oParentObj === oParentObj.valueOf()) {
        return;
      }
    } else if (oParentObj.constructor === Date) {
      oParentEl.appendChild(oXMLDoc.createTextNode(oParentObj.toISOString()));
    }

    for (const sName in oParentObj) {

      let vValue = oParentObj[sName];
      if (vValue === undefined || vValue instanceof Function) {
        continue;
      }
      if (isNumber(sName)) {
        continue;
      }

      if (vValue === null) {
        vValue = {};
      }

      if (sName === this.opts.valueKey) {
        if (vValue !== null && vValue !== true) {
          oParentEl.appendChild(oXMLDoc.createTextNode(vValue.constructor === Date ? vValue.toISOString() : String(vValue)));
        }

      } else if (sName === this.opts.attrKey) {
        for (const sAttrib in vValue) {
          oParentEl.setAttribute(sAttrib, vValue[sAttrib]);
        }
      } else if (sName === this.opts.attrPrefix + 'xmlns') {
        // do nothing: special handling of xml namespaces is done via createElementNS()
      } else if (sName.charAt(0) === this.opts.attrPrefix) {
        oParentEl.setAttribute(sName.slice(1), vValue);
      } else if (vValue.constructor === Array) {
        for (const nItem in vValue) {
          if (!vValue.hasOwnProperty(nItem)) {
            continue;
          }
          const elementNS = (vValue[nItem] && vValue[nItem][this.opts.attrPrefix + 'xmlns']) || oParentEl.namespaceURI;
          const oChild = elementNS ? oXMLDoc.createElementNS(elementNS, sName) : oXMLDoc.createElement(sName);
          this.loadObjTree(oXMLDoc, oChild, vValue[nItem] || {});
          oParentEl.appendChild(oChild);
        }
      } else {
        const elementNS = (vValue || {})[this.opts.attrPrefix + 'xmlns'] || oParentEl.namespaceURI;
        const oChild = elementNS ? oXMLDoc.createElementNS(elementNS, sName) : oXMLDoc.createElement(sName);

        if (vValue instanceof Object) {
          this.loadObjTree(oXMLDoc, oChild, vValue);
        } else if (vValue !== null && (vValue !== true || !this.opts.trueIsEmpty)) {
          oChild.appendChild(oXMLDoc.createTextNode(vValue.toString()));
        }
        oParentEl.appendChild(oChild);
      }
    }
  }

  private xmlToJs(oXMLParent) {
    const aCache = [];
    return this.createObjTree(oXMLParent, aCache);
  }

  private jsToXml(objectTree, namespaceURI?: string, qualifiedName?: string, documentType ?: DocumentType) {
    const oNewDoc = document.implementation.createDocument(namespaceURI || null, qualifiedName || '', documentType || null);
    this.loadObjTree(oNewDoc, oNewDoc.documentElement || oNewDoc, objectTree);
    return oNewDoc;
  }

  private stringToXml(xmlStr: string) {
    const parser = new DOMParser();
    return parser.parseFromString(xmlStr, 'application/xml');
  }

  private xmlToString(xmlObj: any) {
    if (typeof xmlObj.xml !== 'undefined') {
      return xmlObj.xml;
    } else {
      return (new XMLSerializer()).serializeToString(xmlObj);
    }
  }
}
