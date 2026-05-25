import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import FAQItem from './FAQItem';
import { useLanguagePath } from '../../hooks/useLanguagePath';
import type { FAQItem as FAQItemType } from '../../types';

interface FAQSectionConfig {
  title?: string
  leftItems?: FAQItemType[]
  rightItems?: FAQItemType[]
}

function FAQSection({ config = {} }: { config?: FAQSectionConfig }) {
  const { t } = useTranslation();
  const { localizePath } = useLanguagePath();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const leftFAQs = config.leftItems || (t('home.faq.left', { returnObjects: true }) as FAQItemType[]) || [];
  const rightFAQs = config.rightItems || (t('home.faq.right', { returnObjects: true }) as FAQItemType[]) || [];
  const volunteeringUrl = localizePath('/legal/volunteering/');
  const title = config.title || t('home.faq.title');

  return (
    <section className="faq-section" id="faq">
      <h2 className="section-title">{title}</h2>

      <div className="faq-grid">
        <div className="faq-column">
          {leftFAQs.map((faq, index) => (
            <FAQItem
              key={`left-${index}`}
              question={faq.question}
              answer={(faq.answer_html || '').replace('VOLUNTEERING_URL', volunteeringUrl)}
              isActive={activeIndex === index}
              onClick={() => toggleFAQ(index)}
            />
          ))}
        </div>

        <div className="faq-column">
          {rightFAQs.map((faq, index) => (
            <FAQItem
              key={`right-${index}`}
              question={faq.question}
              answer={(faq.answer_html || '').replace('VOLUNTEERING_URL', volunteeringUrl)}
              isActive={activeIndex === index + leftFAQs.length}
              onClick={() => toggleFAQ(index + leftFAQs.length)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default FAQSection;