import React from 'react';

interface FAQItemProps {
  question: string
  answer: string
  isActive?: boolean
  onClick?: () => void
}

function FAQItem({ question, answer, isActive, onClick }: FAQItemProps) {
  return (
    <div className={`faq-item ${isActive ? 'active' : ''}`}>
      <button className="faq-question" onClick={onClick} type="button">
        <span>{question}</span>
        <i className="fas fa-chevron-down" aria-hidden="true" />
      </button>
      <div className="faq-answer">
        <p dangerouslySetInnerHTML={{ __html: answer }} />
      </div>
    </div>
  );
}

export default FAQItem;