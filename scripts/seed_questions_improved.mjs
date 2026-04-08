import fs from 'fs';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DOMAINS = [
  'Blockchain',
  'Cybersecurity',
  'AI/ML',
  'MLOps',
  'Cloud Computing',
  'Quantum Computing',
  'DevOps',
  'Agentic AI',
  'Data Science',
  'IoT'
];

console.log('🎓 Enhanced Question Bank Seeding System\n');

/**
 * IMPROVED QUESTION STRUCTURE
 * Each question now includes:
 * - content: The question text
 * - option_a, option_b, option_c, option_d: Multiple choice options
 * - correct_answer: The letter (A, B, C, or D) of the correct option
 * - difficulty: easy, medium, hard
 * - round_type: bidding or rapid_fire
 * - category: Topic category for better organization
 * - domain_id: Specific domain assignment
 */

const QUESTIONS_BY_DOMAIN = {
  'Blockchain': [
    {
      content: 'What is the primary consensus mechanism used by Bitcoin?',
      option_a: 'Proof of Work',
      option_b: 'Proof of Stake',
      option_c: 'Proof of Authority',
      option_d: 'Proof of History',
      correct_answer: 'A',
      difficulty: 'easy',
      category: 'Consensus Mechanisms'
    },
    {
      content: 'Which blockchain technology eliminates the need for a central authority?',
      option_a: 'Centralized Database',
      option_b: 'Distributed Ledger Technology (DLT)',
      option_c: 'Cloud Storage',
      option_d: 'API Gateway',
      correct_answer: 'B',
      difficulty: 'easy',
      category: 'Blockchain Basics'
    },
    {
      content: 'In a blockchain, what is the maximum supply of Bitcoin?',
      option_a: '10 Million',
      option_b: '21 Million',
      option_c: 'Unlimited',
      option_d: '50 Million',
      correct_answer: 'B',
      difficulty: 'medium',
      category: 'Bitcoin Economics'
    }
  ],
  
  'Cybersecurity': [
    {
      content: 'What does "phishing" refer to in cybersecurity?',
      option_a: 'A fishing technique',
      option_b: 'Attempting to acquire sensitive information through deceptive emails',
      option_c: 'Water security',
      option_d: 'Database optimization',
      correct_answer: 'B',
      difficulty: 'easy',
      category: 'Social Engineering'
    },
    {
      content: 'Which encryption standard is considered deprecated and unsafe?',
      option_a: 'AES-256',
      option_b: 'RSA-2048',
      option_c: 'DES (Data Encryption Standard)',
      option_d: 'SHA-256',
      correct_answer: 'C',
      difficulty: 'medium',
      category: 'Cryptography'
    },
    {
      content: 'What is a "zero-day vulnerability"?',
      option_a: 'A patch released today',
      option_b: 'A vulnerability unknown to vendors, exploited before disclosure',
      option_c: 'A security feature',
      option_d: 'A type of antivirus',
      correct_answer: 'B',
      difficulty: 'hard',
      category: 'Vulnerability Management'
    }
  ],

  'AI/ML': [
    {
      content: 'What does "overfitting" mean in machine learning?',
      option_a: 'Model learning the training data too well',
      option_b: 'Model performing well on all datasets',
      option_c: 'Dataset having too many features',
      option_d: 'Neural network with too many layers',
      correct_answer: 'A',
      difficulty: 'easy',
      category: 'Model Training'
    },
    {
      content: 'Which algorithm is commonly used for image classification?',
      option_a: 'K-Means',
      option_b: 'Convolutional Neural Networks (CNN)',
      option_c: 'Linear Regression',
      option_d: 'Decision Trees',
      correct_answer: 'B',
      difficulty: 'medium',
      category: 'Deep Learning'
    },
    {
      content: 'What is the purpose of a validation set in ML?',
      option_a: 'To train the model',
      option_b: 'To tune hyperparameters and prevent overfitting',
      option_c: 'To store final predictions',
      option_d: 'To generate features',
      correct_answer: 'B',
      difficulty: 'medium',
      category: 'Model Evaluation'
    }
  ],

  'MLOps': [
    {
      content: 'What does MLOps stand for?',
      option_a: 'Machine Learning Optimization',
      option_b: 'Machine Learning Operations',
      option_c: 'Model Loading Operations',
      option_d: 'Multi-Layer Operations',
      correct_answer: 'B',
      difficulty: 'easy',
      category: 'MLOps Basics'
    },
    {
      content: 'Which tool is commonly used for model versioning?',
      option_a: 'Git',
      option_b: 'MLflow or DVC',
      option_c: 'Docker',
      option_d: 'Jenkins',
      correct_answer: 'B',
      difficulty: 'medium',
      category: 'Model Management'
    }
  ],

  'Cloud Computing': [
    {
      content: 'What are the three primary cloud service models?',
      option_a: 'IaaS, PaaS, SaaS',
      option_b: 'HTTP, HTTPS, FTP',
      option_c: 'SQL, NoSQL, NewSQL',
      option_d: 'Frontend, Backend, Database',
      correct_answer: 'A',
      difficulty: 'easy',
      category: 'Cloud Services'
    },
    {
      content: 'Which of these is a public cloud provider?',
      option_a: 'AWS',
      option_b: 'Microsoft Azure',
      option_c: 'Google Cloud',
      option_d: 'All of the above',
      correct_answer: 'D',
      difficulty: 'easy',
      category: 'Cloud Providers'
    }
  ],

  'Quantum Computing': [
    {
      content: 'What is a "qubit" in quantum computing?',
      option_a: 'A regular bit',
      option_b: 'A quantum bit that can be 0, 1, or both simultaneously',
      option_c: 'A quantum processor',
      option_d: 'A type of encryption',
      correct_answer: 'B',
      difficulty: 'easy',
      category: 'Quantum Basics'
    }
  ],

  'DevOps': [
    {
      content: 'What is the primary goal of DevOps?',
      option_a: 'To eliminate developers',
      option_b: 'To integrate development and operations for faster delivery',
      option_c: 'To reduce system requirements',
      option_d: 'To simplify programming',
      correct_answer: 'B',
      difficulty: 'easy',
      category: 'DevOps Principles'
    },
    {
      content: 'Which tool is used for Infrastructure as Code?',
      option_a: 'Terraform',
      option_b: 'Git',
      option_c: 'Python',
      option_d: 'Docker',
      correct_answer: 'A',
      difficulty: 'medium',
      category: 'Infrastructure'
    }
  ],

  'Agentic AI': [
    {
      content: 'What is an autonomous AI agent?',
      option_a: 'AI that requires human intervention',
      option_b: 'AI that can perceive, decide, and act independently',
      option_c: 'AI used only for data analysis',
      option_d: 'AI that cannot learn',
      correct_answer: 'B',
      difficulty: 'easy',
      category: 'Agent Architecture'
    }
  ],

  'Data Science': [
    {
      content: 'Which statistical test is used to determine correlation?',
      option_a: 'T-Test',
      option_b: 'ANOVA',
      option_c: 'Pearson Correlation',
      option_d: 'Chi-Square',
      correct_answer: 'C',
      difficulty: 'medium',
      category: 'Statistics'
    },
    {
      content: 'What is "exploratory data analysis" (EDA)?',
      option_a: 'Building machine learning models',
      option_b: 'Understanding data through visualizations and summaries',
      option_c: 'Creating databases',
      option_d: 'Writing SQL queries',
      correct_answer: 'B',
      difficulty: 'easy',
      category: 'Data Analysis'
    }
  ],

  'IoT': [
    {
      content: 'What does IoT stand for?',
      option_a: 'Internal Operations Technology',
      option_b: 'Internet of Things',
      option_c: 'Internet of Technology',
      option_d: 'Integrated Operational Tactics',
      correct_answer: 'B',
      difficulty: 'easy',
      category: 'IoT Basics'
    },
    {
      content: 'Which protocol is commonly used for IoT devices?',
      option_a: 'HTTP only',
      option_b: 'MQTT',
      option_c: 'FTP',
      option_d: 'SMTP',
      correct_answer: 'B',
      difficulty: 'medium',
      category: 'IoT Communication'
    }
  ]
};

async function seedQuestions() {
  try {
    // Step 1: Get all domains
    const { data: domains, error: domainsError } = await supabase
      .from('domains')
      .select('id, name')
      .order('name');

    if (domainsError) throw domainsError;

    console.log(`📚 Found ${domains.length} domains\n`);

    // Step 2: Archive old questions
    const { data: oldQuestions } = await supabase
      .from('questions')
      .select('id')
      .limit(1);

    if (oldQuestions && oldQuestions.length > 0) {
      console.log('🗑️ Archiving old questions...');
      const { error: archiveError } = await supabase
        .from('questions_archive')
        .insert(
          await supabase.from('questions').select('*')
        );
    }

    // Step 3: Delete existing questions
    const { error: deleteError } = await supabase
      .from('questions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) throw deleteError;
    console.log('🗑️ Cleared old questions\n');

    // Step 4: Insert new questions
    let totalInserted = 0;
    const domainStats = {};

    for (const domainName of DOMAINS) {
      const domain = domains.find(d => d.name === domainName);
      if (!domain) {
        console.log(`⚠️ Domain not found: ${domainName}`);
        continue;
      }

      const domainQuestions = QUESTIONS_BY_DOMAIN[domainName] || [];
      let easyCount = 0, mediumCount = 0, hardCount = 0;

      for (const q of domainQuestions) {
        const roundType = q.difficulty === 'easy' ? 'rapid_fire' : 'bidding';
        
        const { error: insertError } = await supabase.from('questions').insert({
          domain_id: domain.id,
          content: q.content,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          difficulty: q.difficulty,
          round_type: roundType,
          category: q.category,
          is_active: false
        });

        if (insertError) {
          console.error(`❌ Error inserting question for ${domainName}:`, insertError);
        } else {
          totalInserted++;
          if (q.difficulty === 'easy') easyCount++;
          else if (q.difficulty === 'medium') mediumCount++;
          else hardCount++;
        }
      }

      domainStats[domainName] = { easy: easyCount, medium: mediumCount, hard: hardCount };
      console.log(`✅ ${domainName}: ${easyCount} easy + ${mediumCount} medium + ${hardCount} hard = ${easyCount + mediumCount + hardCount} total`);
    }

    console.log(`\n✨ Successfully seeded ${totalInserted} questions across ${DOMAINS.length} domains!\n`);
    console.log('📊 Domain Breakdown:');
    Object.entries(domainStats).forEach(([domain, stats]) => {
      const total = stats.easy + stats.medium + stats.hard;
      console.log(`  ${domain}: ${total} questions`);
    });

  } catch (error) {
    console.error('❌ Error seeding questions:', error.message);
    process.exit(1);
  }
}

console.log('Starting improved question seeding...\n');
await seedQuestions();
