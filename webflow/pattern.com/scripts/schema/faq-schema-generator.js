/**
 * Dynamic FAQ Schema Generator for Webflow
 * 
 * This script automatically generates FAQ schema markup from
 * your CMS-generated FAQ content on the page.
 * 
 * Usage:
 * 1. Add this script to your page's Custom Code -> <head> section
 * 2. Update the selectors below to match your FAQ structure
 * 3. The schema will be automatically generated and injected
 */

(function () {
  'use strict';

  // Track if schema has been generated to avoid duplicates
  let schemaGenerated = false;

  // CONFIGURATION: FAQ structure for Pattern.com
  const FAQ_CONFIG = {
    // Each FAQ item is wrapped in .faq_card
    cardSelector: '.faq_card',

    // Question text inside .faq_question
    questionSelector: '.faq_question',

    // Answer rich-text inside .faq_answer
    answerSelector: '.faq_answer'
  };

  /**
   * Extract text content from an element, cleaning HTML tags
   */
  function getTextContent(element) {
    if (!element) return '';
    return element.textContent.trim().replace(/\s+/g, ' ');
  }

  /**
   * Extract FAQs from the page
   */
  function extractFAQs() {
    const faqs = [];
    const cardElements = document.querySelectorAll(FAQ_CONFIG.cardSelector);

    // Iterate through each FAQ card
    cardElements.forEach(card => {
      const questionEl = card.querySelector(FAQ_CONFIG.questionSelector);
      const answerEl = card.querySelector(FAQ_CONFIG.answerSelector);

      const question = getTextContent(questionEl);
      const answer = getTextContent(answerEl);

      if (question && answer) {
        faqs.push({ question, answer });
      }
    });

    return faqs;
  }

  /**
   * Generate FAQ schema JSON-LD
   */
  function generateFAQSchema(faqs) {
    if (faqs.length === 0) return null;

    // Filter out any FAQs with empty or invalid content
    const validFAQs = faqs.filter(faq =>
      faq.question && faq.question.length > 3 &&
      faq.answer && faq.answer.length > 10
    );

    if (validFAQs.length === 0) return null;

    const mainEntity = validFAQs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }));

    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": mainEntity
    };
  }

  /**
   * Inject the schema into the page head
   */
  function injectSchema(schema) {
    if (!schema) return;

    try {
      // Remove any existing FAQ schema
      const existing = document.querySelector('script[data-faq-schema]');
      if (existing) {
        existing.remove();
      }

      // Create and inject new schema
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-faq-schema', 'true');
      script.textContent = JSON.stringify(schema, null, 2);
      document.head.appendChild(script);

      console.log('FAQ Schema injected successfully', schema);
    } catch (error) {
      console.error('Error injecting FAQ schema:', error);
    }
  }

  /**
   * Check if page already has FAQ schema
   */
  function hasExistingFAQSchema() {
    // Check for any existing FAQPage schema in script tags
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (let script of scripts) {
      try {
        const content = JSON.parse(script.textContent);
        if (content['@type'] === 'FAQPage' ||
          (content.mainEntity && Array.isArray(content.mainEntity) &&
            content.mainEntity.some(item => item['@type'] === 'Question'))) {
          console.log('Page already has FAQ schema, skipping generation');
          return true;
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    return false;
  }

  /**
   * Main function to generate and inject schema
   */
  function generateSchema() {
    if (schemaGenerated) {
      console.log('FAQ Schema already generated, skipping duplicate run');
      return;
    }

    // Check if page already has FAQ schema (either static or dynamic)
    if (hasExistingFAQSchema()) {
      schemaGenerated = true;
      return;
    }

    const faqs = extractFAQs();
    const schema = generateFAQSchema(faqs);

    if (schema && schema.mainEntity.length > 0) {
      injectSchema(schema);
      console.log('FAQ Schema generated for', schema.mainEntity.length, 'questions');
      schemaGenerated = true;
    } else {
      console.warn('No FAQs found on page. Looking for elements with class: ' + FAQ_CONFIG.cardSelector);
    }
  }

  /**
   * Initialize the FAQ schema generator
   */
  function init() {
    // Wait for CMS content to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        setTimeout(function () { init(); }, 200);
      });
      return;
    }

    // If Webflow CMS is present, wait for it to render
    if (typeof Webflow !== 'undefined') {
      Webflow.push(function () {
        // Give more time for CMS content to render
        setTimeout(generateSchema, 500);
      });
    } else {
      // If no Webflow CMS, still give a small delay
      setTimeout(generateSchema, 300);
    }
  }

  // Start the process
  init();

  // Re-run if content changes (for dynamic content) - but only once
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(function (mutations) {
      if (schemaGenerated) return; // Don't re-run if already generated

      let hasFAQs = false;
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1 && (
              node.classList.contains('faq_card') ||
              node.querySelector && node.querySelector('.faq_card')
            )) {
              hasFAQs = true;
            }
          });
        }
      });
      if (hasFAQs && !schemaGenerated) {
        setTimeout(function () {
          if (!schemaGenerated) {
            generateSchema();
          }
        }, 100);
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
})();
