import { Component } from '@angular/core';
import { Jxon } from '../jxon/jxon';
import { isNumber } from 'util';

class Patient {
  public name = 'Alf';
  public age = 3;
}

@Component({
  selector:    'app-root',
  templateUrl: './app.component.html',
  styleUrls:   ['./app.component.scss']
})
export class AppComponent {
  title = 'jxon';

  constructor() {

    const jxon = new Jxon();

    jxon.config({
      valueKey:            '_',
      attrKey:             '$',
      attrPrefix:          '$',
      lowerCaseTags:       false,
      trueIsEmpty:         false,
      autoDate:            false,
      useISO:              true,
      ignorePrefixedNodes: false,
      parseValues:         false,
    });

    /*
    const obj2: any = {};
    obj2.patient = new Patient();

    const s1 = jxon.jsToString(obj2)
    console.log(s1);

    const patinet2: Patient = jxon.stringToJs(s1).patient;
    console.log(patinet2);
*/
    console.log(jxon.jsToString({name: 'myportal'}));

    console.log(jxon.jsToString({
      user: {
        username: 'testUser1',
        password: 'yolo',
        enabled:  true
      }
    }));
    console.log(jxon.jsToString({
      tag: {
        $type:      'regular',
        $blacklist: false,
        _:          'Backbase'
      }
    }));
    console.log(jxon.jsToString({
      dogs: {
        name: ['Charlie', {$nick: 'yes', _: 'Mad Max'}]
      }
    }));

    console.log(jxon.stringToJs('<name>myportal</name>'));

    console.log(jxon.stringToJs('<user>\n' +
      '  <username>testUser1</username>\n' +
      '  <password>yolo</password>\n' +
      '  <enabled>true</enabled>\n' +
      '</user>'));

    console.log(jxon.stringToJs('<tag type="regular" blacklist="false">Backbase</tag>\n'));
    console.log(jxon.stringToJs('<dogs>\n' +
      '    <name>Charlie</name>\n' +
      '    <name nick="yes">Mad Max</name>\n' +
      '</dogs>'));
  }
}
