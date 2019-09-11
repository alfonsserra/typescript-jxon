import { Component } from '@angular/core';
import { JxonService } from '../jxon/jxon.service';

@Component({
  selector:    'app-root',
  templateUrl: './app.component.html',
  styleUrls:   ['./app.component.scss']
})
export class AppComponent {
  title = 'jxon';

  constructor(private jxon: JxonService) {

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
  }

}
