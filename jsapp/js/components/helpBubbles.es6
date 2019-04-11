import _ from 'underscore';
import React from 'react';
import ReactDOM from 'react-dom';
import autoBind from 'react-autobind';
import bem from '../bem';
import actions from '../actions';
import stores from '../stores';
import {t} from '../utils';

const BUBBLE_OPENED_EVT_NAME = 'help-bubble-opened';

class HelpBubble extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);
    this.state = {
      isOpen: false,
      isOutsideCloseEnabled: true
    };
    this.cancelOutsideCloseWatch = Function.prototype;
    this.cancelHelpBubbleEventCloseWatch = Function.prototype;
  }

  open() {
    this.setState({isOpen: true});

    // tell all HelpBubbles that this one have just opened
    const bubbleOpenedEvt = new CustomEvent(BUBBLE_OPENED_EVT_NAME, {detail: this.bubbleName});
    document.dispatchEvent(bubbleOpenedEvt);

    // if enabled we want to close this HelpBubble
    // whenever user clicks outside it or hits ESC key
    this.cancelOutsideCloseWatch();
    if (this.state.isOutsideCloseEnabled) {
      this.watchOutsideClose();
    }

    // we want to close all the other HelpBubbles whenever one opens
    this.cancelHelpBubbleEventCloseWatch();
    this.watchHelpBubbleEventClose();

    // counts how many times have this bubble been opened
    if (this.bubbleName) {
      this.bumpNewCounter(this.bubbleName);
    }
  }

  close() {
    this.setState({isOpen: false});
    this.cancelOutsideCloseWatch();
  }

  toggle() {
    if (this.state.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  watchHelpBubbleEventClose() {
    const helpBubbleEventHandler = (evt) => {
      if (evt.detail !== this.bubbleName) {this.close();}
    }

    document.addEventListener(BUBBLE_OPENED_EVT_NAME, helpBubbleEventHandler);

    this.cancelHelpBubbleEventCloseWatch = () => {
      document.removeEventListener(BUBBLE_OPENED_EVT_NAME, helpBubbleEventHandler);
    }
  }

  watchOutsideClose() {
    const outsideClickHandler = (evt) => {
      const $targetEl = $(evt.target);
      if (
        $targetEl.parents('.help-bubble__back').length === 0 &&
        $targetEl.parents('.help-bubble__popup').length === 0 &&
        $targetEl.parents('.help-bubble__popup-content').length === 0 &&
        $targetEl.parents('.help-bubble__row').length === 0 &&
        $targetEl.parents('.help-bubble__row-wrapper').length === 0
      ) {
        this.close();
      }
    }

    const escHandler = (evt) => {
      if (evt.keyCode === 27 || evt.key === 'Escape') {
        this.close();
      }
    }

    this.cancelOutsideCloseWatch = () => {
      document.removeEventListener('click', outsideClickHandler);
      document.removeEventListener('keydown', escHandler);
    }

    document.addEventListener('click', outsideClickHandler);
    document.addEventListener('keydown', escHandler);
  }

  getStorageName(bubbleName) {
    const currentUsername = stores.session.currentAccount && stores.session.currentAccount.username;
    return `kobo.${currentUsername}.${bubbleName}`;
  }

  // we display "NEW" badge for first 5 times user interacts with bubble
  isNew(bubbleName) {
    const storageName = this.getStorageName(bubbleName);
    const storageItem = window.localStorage.getItem(storageName);
    if (storageItem !== null) {
      return parseInt(storageItem) <= 5;
    } else {
      return true;
    }
  }

  bumpNewCounter(bubbleName) {
    const storageName = this.getStorageName(bubbleName);
    const storageItem = window.localStorage.getItem(storageName);
    if (storageItem === null) {
      window.localStorage.setItem(storageName, 0);
    } else {
      window.localStorage.setItem(storageName, parseInt(storageItem) + 1);
    }
  }
}

class HelpBubbleTrigger extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);
  }

  render() {
    const iconClass = `k-icon k-icon-${this.props.icon}`;
    const hasCounter = typeof this.props.counter === 'number' && this.props.counter !== 0;

    return (
      <bem.HelpBubble__trigger
        onClick={this.props.onClick}
        data-tip={this.props.tooltipLabel}
      >
        <i className={iconClass}/>

        {hasCounter &&
          <bem.HelpBubble__triggerCounter>
            {this.props.counter}
          </bem.HelpBubble__triggerCounter>
        }

        {this.props.isNew &&
          <bem.HelpBubble__triggerBadge>
            {t('new')}
          </bem.HelpBubble__triggerBadge>
        }
      </bem.HelpBubble__trigger>
    );
  }
}

class HelpBubbleClose extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);
  }

  render() {
    const attrs = {}

    if (this.props.messageUid) {
      attrs['data-message-uid'] = this.props.messageUid;
    }

    return (
      <bem.HelpBubble__close onClick={this.props.onClick} {...attrs}>
        <i className='k-icon k-icon-close'/>
      </bem.HelpBubble__close>
    );
  }
}

export class IntercomHelpBubble extends HelpBubble {
  constructor(props) {
    super(props);
    autoBind(this);
    this.state = {
      hasIntercom: false
    }
    this.bubbleName = 'intercom-help-bubble';
  }

  render() {
    const attrs = {};
    if (this.isNew(this.bubbleName)) {
      attrs.isNew = true;
    }

    const modifiers = ['intercom'];
    if (this.state.isOpen) {
      modifiers.push('open');
    }

    return (
      <bem.HelpBubble m={modifiers}>
        <HelpBubbleTrigger
          icon='intercom'
          tooltipLabel={t('Intercom')}
          onClick={this.toggle.bind(this)}
          {...attrs}
        />

        {this.state.isOpen &&
          <bem.HelpBubble__popup>
            <HelpBubbleClose onClick={this.close.bind(this)}/>

            <bem.HelpBubble__popupContent>
              {this.state.hasIntercom &&
                <span>intercom!</span>
              }
              {!this.state.hasIntercom &&
                <bem.HelpBubble__rowAnchor
                  m='link'
                  target='_blank'
                  href='https://test.test'
                >
                  <header>{t('Chat Support Unavailable')}</header>
                  <p>{t('You need to ABC to get XYZ')}</p>
                </bem.HelpBubble__rowAnchor>
              }
            </bem.HelpBubble__popupContent>
          </bem.HelpBubble__popup>
        }
      </bem.HelpBubble>
    );
  }
}

export class SupportHelpBubble extends HelpBubble {
  constructor(props) {
    super(props);
    autoBind(this);
    this.state = {
      selectedMessageUid: null,
      hasUnacknowledgedMessages: false,
      messages: []
    }
    this.bubbleName = 'support-help-bubble';
    this.dataUnlisteners = [];
  }

  componentWillUnmount() {
    this.dataUnlisteners.forEach((clb) => {clb();});
  }

  componentDidMount() {
    this.dataUnlisteners.push(
      actions.help.getInAppMessages.completed.listen(this.onHelpGetInAppMessagesCompleted.bind(this)),
      actions.help.getInAppMessages.failed.listen(this.onHelpGetInAppMessagesFailed.bind(this)),
      actions.help.setMessageReadTime.completed.listen(this.onHelpPatchMessage.bind(this)),
      actions.help.setMessageAcknowledged.completed.listen(this.onHelpPatchMessage.bind(this))
    );

    actions.help.getInAppMessages();
  }

  onHelpGetInAppMessagesCompleted(response) {
    this.setState({messages: response.results});
    this.checkForUnacknowledgedMessages(response.results);
  }

  onHelpGetInAppMessagesFailed(response) {
    this.setState({messages: []});
    this.checkForUnacknowledgedMessages([]);
  }

  onHelpPatchMessage(message) {
    const newMessages = this.state.messages;
    for (let i = 0; i < newMessages.length; i++) {
      if (newMessages[i].uid === message.uid) {
        // update patched messages in the list of messages
        newMessages[i] = message;
      }
    }
    this.setState({messages: newMessages});
    this.checkForUnacknowledgedMessages(newMessages);
  }

  close() {
    super.close();
    this.clearSelectedMessage();
  }

  selectMessage(evt) {
    const messageUid = evt.currentTarget.dataset.messageUid;
    this.setState({selectedMessageUid: messageUid});
    if (!this.isMessageRead(messageUid)) {
      this.markMessageRead(messageUid);
    }
  }

  selectUnacknowledgedListMessage(evt) {
    this.selectMessage(evt);
    this.open();
  }

  clearSelectedMessage() {
    this.setState({selectedMessageUid: null});
  }

  findMessage(messageUid) {
    return _.find(this.state.messages, {uid: messageUid});
  }

  isMessageRead(messageUid) {
    const msg = this.findMessage(messageUid);
    return !!msg.interactions.readTime;
  }

  markMessageRead(messageUid) {
    const currentTime = new Date();
    actions.help.setMessageReadTime(messageUid, currentTime.toISOString())
  }

  markMessageAcknowledged(evt) {
    const messageUid = evt.currentTarget.dataset.messageUid;
    actions.help.setMessageAcknowledged(messageUid, true)
  }

  checkForUnacknowledgedMessages(newMessages) {
    let hasUnacknowledgedMessages = false;
    newMessages.forEach((msg) => {
      if (!msg.interactions.acknowledged) {
        hasUnacknowledgedMessages = true;
      }
    });
    this.setState({
      hasUnacknowledgedMessages: hasUnacknowledgedMessages,
      isOutsideCloseEnabled: !hasUnacknowledgedMessages
    });
  }

  getUnreadMessagesCount() {
    let count = 0;
    this.state.messages.forEach((msg) => {
      if (!msg.interactions.readTime) {
        count++;
      }
    });
    return count;
  }

  renderSnippetRow(msg, clickCallback) {
    const modifiers = ['message', 'message-clickable'];
    if (!msg.interactions.readTime) {
      modifiers.push('message-unread');
    }
    return (
      <bem.HelpBubble__row
        m={modifiers}
        key={msg.uid}
        data-message-uid={msg.uid}
        onClick={clickCallback}
      >
        <span>{msg.title}</span>
        <div dangerouslySetInnerHTML={{__html: msg.html.snippet}}/>
      </bem.HelpBubble__row>
    );
  }

  renderDefaultPopup() {
    return (
      <bem.HelpBubble__popup>
        <HelpBubbleClose onClick={this.close.bind(this)}/>

        <bem.HelpBubble__popupContent>
          <bem.HelpBubble__row m='header'>
            <header>{t('Looking for help?')}</header>
            <p><em>{t('Try visiting one of our online support resources')}</em></p>
          </bem.HelpBubble__row>

          <bem.HelpBubble__rowAnchor
            m='link'
            target='_blank'
            href='https://test.test'
            onClick={this.close.bind(this)}
          >
            <i className='k-icon k-icon-help-articles'/>
            <header>{t('KoBoToolbox Help Center')}</header>
            <p>{t('A vast collection of user support articles and tutorials related to KoBo')}</p>
          </bem.HelpBubble__rowAnchor>

          <bem.HelpBubble__rowAnchor
            m='link'
            target='_blank'
            href='https://test.test'
            onClick={this.close.bind(this)}
          >
            <i className='k-icon k-icon-forum'/>
            <header>{t('KoBoToolbox Community Forum')}</header>
            <p>{t('Post your questions to get answers from experienced KoBo users around the world')}</p>
          </bem.HelpBubble__rowAnchor>

          {this.state.messages.map((msg) => {
            const modifiers = ['message', 'message-clickable'];
            if (!msg.interactions.readTime) {
              modifiers.push('message-unread');
            }
            return this.renderSnippetRow(msg, this.selectMessage.bind(this));
          })}
        </bem.HelpBubble__popupContent>
      </bem.HelpBubble__popup>
    );
  }

  renderUnacknowledgedListPopup() {
    return (
      <bem.HelpBubble__popup>
        <bem.HelpBubble__popupContent>
          {this.state.messages.map((msg) => {
            if (msg.interactions.acknowledged) {
              return;
            }

            return (
              <bem.HelpBubble__rowWrapper key={msg.uid}>
                <HelpBubbleClose
                  messageUid={msg.uid}
                  onClick={this.markMessageAcknowledged.bind(this)}
                />

                {this.renderSnippetRow(msg, this.selectUnacknowledgedListMessage.bind(this))}
              </bem.HelpBubble__rowWrapper>
            )
          })}
        </bem.HelpBubble__popupContent>
      </bem.HelpBubble__popup>
    );
  }

  renderMessagePopup() {
    const msg = this.findMessage(this.state.selectedMessageUid);

    return (
      <bem.HelpBubble__popup>
        <HelpBubbleClose onClick={this.close.bind(this)}/>

        <bem.HelpBubble__back onClick={this.clearSelectedMessage.bind(this)}>
          <i className='k-icon k-icon-prev'/>
        </bem.HelpBubble__back>

        <bem.HelpBubble__popupContent>
          <bem.HelpBubble__row m='message'>
            <span className='help-bubble__popup-title'>{msg.title}</span>
            <div dangerouslySetInnerHTML={{__html: msg.html.body}}/>
          </bem.HelpBubble__row>
        </bem.HelpBubble__popupContent>
      </bem.HelpBubble__popup>
    );
  }

  render() {
    const attrs = {};
    if (this.isNew(this.bubbleName)) {
      attrs.isNew = true;
    }

    let popupRenderFn;
    const modifiers = [];
    if (this.state.isOpen) {
      modifiers.push('open');
      if (this.state.selectedMessageUid) {
        popupRenderFn = this.renderMessagePopup;
        modifiers.push('single-message');
      } else {
        popupRenderFn = this.renderDefaultPopup;
        modifiers.push('list-with-header');
      }
    }  else if (this.state.hasUnacknowledgedMessages) {
      popupRenderFn = this.renderUnacknowledgedListPopup;
      modifiers.push('list')
    }

    return (
      <bem.HelpBubble m={modifiers}>
        <HelpBubbleTrigger
          icon='help'
          tooltipLabel={t('Help')}
          onClick={this.toggle.bind(this)}
          counter={this.getUnreadMessagesCount()}
          {...attrs}
        />

        {popupRenderFn &&
          popupRenderFn()
        }
      </bem.HelpBubble>
    );
  }
}
