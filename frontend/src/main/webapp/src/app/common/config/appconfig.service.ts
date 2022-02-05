import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
// TODO maybe obsolete
export class AppConfigService {
  private appConfig: AppConfig;

  constructor(private http: HttpClient) { }

  loadAppConfig() {
    let configUrl = "config.json"
    /*
    return this.http.get<AppConfig>(configUrl)
      .toPromise()
      .then(data => {
        console.log("REQ OK", data)
        this.appConfig = data;
      });
      */
  }

  getConfig() {
    return this.appConfig;
  }

}

type AppConfig = {
  apiBaseUrl: string
}
