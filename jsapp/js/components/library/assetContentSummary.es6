import React from 'react';
import autoBind from 'react-autobind';
import bem from 'js/bem';
import {getQuestionDisplayName} from 'js/formUtils';
import {QUESTION_TYPES} from 'js/constants';
import {t} from 'js/utils';

const QUESTION_LIMIT = 8;

class AssetContentSummary extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      isExpanded: false,
      isExpandable: false
    };
    autoBind(this);
  }

  componentDidMount() {
    console.debug('AssetContentSummary did mount', this.props);
    this.setState({
      isExpandable: this.props.assetContent.survey.length > QUESTION_LIMIT
    });
  }

  renderQuestion(question, itemIndex) {
    const typeDef = QUESTION_TYPES.get(question.type);
    const modifiers = ['columns', 'padding-small'];
    if (itemIndex !== 0) {
      modifiers.push('bordertop');
    }
    return (
      <bem.FormView__cell
        m={modifiers}
        key={question.$kuid}
      >
        <bem.FormView__cell m='column-1'>
          <i className={['fa', 'fa-lg', typeDef.faIcon].join(' ')}/>
          &nbsp;
          {getQuestionDisplayName(question)}
        </bem.FormView__cell>
      </bem.FormView__cell>
    );
  }

  filterRealQuestions(questions) {
    return questions.filter((question) => {
      return QUESTION_TYPES.has(question.type);
    });
  }

  toggleExpanded() {
    this.setState({isExpanded: !this.state.isExpanded});
  }

  render() {
    if (!this.props.assetContent) {
      return null;
    }

    let items = this.filterRealQuestions(this.props.assetContent.survey);
    if (this.state.isExpandable && !this.state.isExpanded) {
      items = items.slice(0, QUESTION_LIMIT);
    }

    return (
      <bem.FormView__cell m='box'>
        {items.map(this.renderQuestion)}

        {this.state.isExpandable &&
          <bem.FormView__cell m={['bordertop', 'toggle-details']}>
            <button onClick={this.toggleExpanded}>
              {this.state.isExpanded ? <i className='k-icon k-icon-up'/> : <i className='k-icon k-icon-down'/>}
              {this.state.isExpanded ? t('Show less') : t('Show more')}
            </button>
          </bem.FormView__cell>
        }
      </bem.FormView__cell>
    );
  }
}

export default AssetContentSummary;