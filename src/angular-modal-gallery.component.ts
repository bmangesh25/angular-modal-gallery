/*
 The MIT License (MIT)

 Copyright (c) 2017 Stefano Cappa (Ks89)
 Copyright (c) 2016 vimalavinisha

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */

import {OnInit, Input, Output, EventEmitter, HostListener, Component, OnDestroy} from '@angular/core';
import {Observable, Subscription} from "rxjs";
import 'mousetrap';

export enum Action {
  NORMAL, // default value
  CLICK, // mouse click
  KEYBOARD,
  SWIPE,
  LOAD
}

export class ImageModalEvent {
  action: Action;
  result: number | boolean;

  constructor(action: Action, result: number | boolean) {
    this.action = action;
    this.result = result;
  }
}

export class Image {
  thumb: string;
  img: string;
  description: string;

  constructor(thumb: string, img: string, description: string) {
    this.thumb = thumb;
    this.img = img;
    this.description = description;
  }
}

export enum Keyboard {
  ESC = 27,
  LEFT_ARROW = 37,
  RIGHT_ARROW = 39,
  UP_ARROW = 38,
  DOWN_ARROW = 40
}

@Component({
  selector: 'imageModal',
  exportAs: 'imageModal',
  styleUrls: ['./angular-modal-gallery.scss'],
  template: `
    <div class="ng-gallery" *ngIf="showGallery">
      <div *ngFor="let i of images; let index = index">
        <img src="{{ i.thumb }}" class="ng-thumb" (click)="showModalGallery(index)" alt="{{ i.description }}"/>
      </div>
    </div>
    <div class="ng-overlay" *ngIf="opened">
      <div class="ng-gallery-content">
        <div class="uil-ring-css" *ngIf="loading">
          <div></div>
        </div>
        <a class="download-image" *ngIf="showDownloadButton" (click)="downloadImage()"><i class="fa fa-download"></i></a>
        <a class="close-popup" (click)="closeGallery()"><i class="fa fa-close"></i></a>
        <a class="nav-left" *ngIf="(images)?.length > 1" (click)="prevImage()"><i class="fa fa-angle-left"></i></a>
        <img *ngIf="!loading" src="{{ currentImage.img }}" (click)="nextImage(clickAction)" class="effect" (swipeleft)="swipe(currentImageIndex, $event.type)" (swiperight)="swipe(currentImageIndex, $event.type)"/>
        <a class="nav-right" *ngIf="(images)?.length > 1" (click)="nextImage()"><i class="fa fa-angle-right"></i></a>
        <span class="info-text">{{ currentImageIndex + 1 }}/{{ images.length }} - {{ currentImage.description }}</span>
      </div>
    </div>
  `
})
export class AngularModalGallery implements OnInit, OnDestroy {
  opened: boolean = false;
  loading: boolean = false;
  showGallery: boolean = false;

  images: Image[];
  currentImage: Image;
  currentImageIndex: number = 0;

  // enum action used to pass a click action
  // when you clicks over the modal image.
  // Declared here  to use it in the template.
  clickAction: Action = Action.CLICK;

  private SWIPE_ACTION = {
    LEFT: 'swipeleft',
    RIGHT: 'swiperight',
    UP: 'swipeup',
    DOWN: 'swipedown'
  };

  private subscription: Subscription;

  @Input() modalImages: Observable<Array<Image>> | Array<Image>;
  @Input() imagePointer: number;
  @Input() showDownloadButton: boolean = false;
  @Input() downloadable: boolean = false;

  @Output() close = new EventEmitter<ImageModalEvent>();
  @Output() show = new EventEmitter<ImageModalEvent>();
  @Output() firstImage = new EventEmitter<ImageModalEvent>();
  @Output() lastImage = new EventEmitter<ImageModalEvent>();
  @Output() hasData = new EventEmitter<ImageModalEvent>();

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (!this.opened) {
      return;
    }
    switch (e.keyCode) {
      case Keyboard.ESC:
        this.closeGallery(Action.KEYBOARD);
        break;
      case Keyboard.RIGHT_ARROW:
        this.nextImage(Action.KEYBOARD);
        break;
      case Keyboard.LEFT_ARROW:
        this.prevImage(Action.KEYBOARD);
        break;
    }
  }

  ngOnInit() {
    console.log("called oninit");
    var thiz = this;
    Mousetrap.bind(['ctrl+s', 'meta+s'], function(e) {
      if (e.preventDefault) {
        e.preventDefault();
      } else {
        // internet explorer
        e.returnValue = false;
      }
      console.log("thiz.downloadable " + thiz.downloadable);
      thiz.downloadImage();
    });

    // required before showModalGallery, otherwise this.images will be undefined
    this.initImages();

    this.loading = true;
    if (this.imagePointer >= 0) {
      this.showGallery = false;
      this.showModalGallery(this.imagePointer);
    } else {
      this.showGallery = true;
    }
  }

  private initImages() {
    if (this.modalImages instanceof Array) {
      this.images = this.modalImages;
      this.hasData.emit(new ImageModalEvent(Action.LOAD, true));
    } else {
      this.subscription = this.modalImages.subscribe((val: Array<Image>) => {
        this.images = val;
        this.hasData.emit(new ImageModalEvent(Action.LOAD, true));
      });
    }
  }

  // hammerjs touch gestures support
  swipe(index: number, action = this.SWIPE_ACTION.RIGHT) {
    switch (action) {
      case this.SWIPE_ACTION.RIGHT:
        this.nextImage(Action.SWIPE);
        break;
      case this.SWIPE_ACTION.LEFT:
        this.prevImage(Action.SWIPE);
        break;
      // case this.SWIPE_ACTION.UP:
      //   break;
      // case this.SWIPE_ACTION.DOWN:
      //   break;
    }
  }

  closeGallery(action: Action = Action.NORMAL) {
    this.opened = false;
    this.close.emit(new ImageModalEvent(action, true));
  }

  prevImage(action: Action = Action.NORMAL) {
    this.loading = true;
    this.currentImageIndex = this.getPrevIndex(action, this.currentImageIndex);
    this.showModalGallery(this.currentImageIndex);
  }

  nextImage(action: Action = Action.NORMAL) {
    this.loading = true;
    this.currentImageIndex = this.getNextIndex(action, this.currentImageIndex);
    this.showModalGallery(this.currentImageIndex);
  }

  showModalGallery(index: number) {
    this.currentImageIndex = index;
    this.opened = true;
    this.currentImage = this.images[this.currentImageIndex];
    this.loading = false;
  }

  downloadImage() {
    if (!this.downloadable) {
      return;
    }
    console.log("downloading...");
    if (navigator.msSaveBlob) {
      // IE11 & Edge
      // TODO FIXME implement this
      // navigator.msSaveBlob(csvData, exportFilename);
    } else {
      console.log("downloading in else (so not IE)");
      console.log("getfilename is: " + this.getFileName(this.currentImage.img));
      // other browsers
      let link = document.createElement('a');
      link.href = this.currentImage.img;
      link.setAttribute('download', this.getFileName(this.currentImage.img));
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  private getNextIndex(action: Action, currentIndex: number): number {
    let newIndex: number = 0;
    if (currentIndex >= 0 && currentIndex < this.images.length - 1) {
      newIndex = currentIndex + 1;
    } else {
      newIndex = 0; // start from the first index
    }

    // emit first/last event based on newIndex value
    this.emitBoundaryEvent(action, newIndex);

    // emit current visibile image index
    this.show.emit(new ImageModalEvent(action, newIndex));

    return newIndex;
  }

  private getPrevIndex(action: Action, currentIndex: number): number {
    let newIndex: number = 0;
    if (currentIndex > 0 && currentIndex <= this.images.length - 1) {
      newIndex = currentIndex - 1;
    } else {
      newIndex = this.images.length - 1; // start from the last index
    }

    // emit first/last event based on newIndex value
    this.emitBoundaryEvent(action, newIndex);

    // emit current visibile image index
    this.show.emit(new ImageModalEvent(action, newIndex));

    return newIndex;
  }

  private emitBoundaryEvent(action: Action, indexToCheck: number) {
    // to emit first/last event
    switch (indexToCheck) {
      case 0:
        this.firstImage.emit(new ImageModalEvent(action, true));
        break;
      case this.images.length - 1:
        this.lastImage.emit(new ImageModalEvent(action, true));
        break;
    }
  }

  private getFileName(path: string) {
    return path.replace(/^.*[\\\/]/, '')
  }

  ngOnDestroy() {
    console.log("called ondestroy");
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    Mousetrap.unbind(['ctrl+s', 'meta+s']);
  }
}