import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DOMAINS = ['Blockchain', 'Cybersecurity', 'AI/ML', 'MLOps', 'Cloud Computing', 'Quantum Computing', 'DevOps', 'Agentic AI', 'Data Science', 'IoT'];

// Format: "Question Text|A) Option A|B) Option B|C) Option C|D) Option D|Correct Answer"
const QUESTIONS_BY_DOMAIN = {
  'Blockchain': [
    'What is the primary consensus mechanism used by Bitcoin?|A) Proof of Work|B) Proof of Stake|C) Proof of Authority|D) Proof of History|A',
    'Which blockchain technology eliminates the need for a central authority?|A) Centralized Database|B) Distributed Ledger Technology (DLT)|C) Cloud Storage|D) API Gateway|B',
    'In a blockchain, what is the maximum supply of Bitcoin?|A) 10 Million|B) 21 Million|C) Unlimited|D) 50 Million|B',
  ],
  'Cybersecurity': [
    'What does "phishing" refer to in cybersecurity?|A) A fishing technique|B) Attempting to acquire sensitive information through deceptive emails|C) Water security|D) Database optimization|B',
    'Which encryption standard is considered deprecated and unsafe?|A) AES-256|B) RSA-2048|C) DES (Data Encryption Standard)|D) SHA-256|C',
    'What is a "zero-day vulnerability"?|A) A patch released today|B) A vulnerability unknown to vendors, exploited before disclosure|C) A security feature|D) A type of antivirus|B',
  ],
  'AI/ML': [
    'What does "overfitting" mean in machine learning?|A) Model learning the training data too well|B) Model performing well on all datasets|C) Dataset having too many features|D) Neural network with too many layers|A',
    'Which algorithm is commonly used for image classification?|A) K-Means|B) Convolutional Neural Networks (CNN)|C) Linear Regression|D) Decision Trees|B',
    'What is the purpose of a validation set in ML?|A) To train the model|B) To tune hyperparameters and prevent overfitting|C) To store final predictions|D) To generate features|B',
  ],
  'MLOps': [
    'What does MLOps stand for?|A) Machine Learning Optimization|B) Machine Learning Operations|C) Model Loading Operations|D) Multi-Layer Operations|B',
    'Which tool is commonly used for model versioning?|A) Git|B) MLflow or DVC|C) Docker|D) Jenkins|B',
    'What is the purpose of CI/CD in MLOps?|A) To eliminate testing|B) To automate deployment and testing of ML models|C) To reduce team size|D) To simplify code|B',
  ],
  'Cloud Computing': [
    'What are the three primary cloud service models?|A) IaaS, PaaS, SaaS|B) HTTP, HTTPS, FTP|C) SQL, NoSQL, NewSQL|D) Frontend, Backend, Database|A',
    'Which of these is a public cloud provider?|A) AWS|B) Microsoft Azure|C) Google Cloud|D) All of the above|D',
    'What does "elasticity" mean in cloud computing?|A) The ability to stretch data|B) The ability to scale resources up or down based on demand|C) Cloud flexibility in color|D) Network speed|B',
  ],
  'Quantum Computing': [
    'What is a "qubit" in quantum computing?|A) A regular bit|B) A quantum bit that can be 0, 1, or both simultaneously|C) A quantum processor|D) A type of encryption|B',
    'Which principle allows qubits to be in multiple states at once?|A) Superposition|B) Entanglement|C) Interference|D) Decoherence|A',
    'What is quantum entanglement?|A) When qubits are physically connected|B) When qubits are in the same state|C) A phenomenon where particles are correlated independent of distance|D) A type of quantum error|C',
  ],
  'DevOps': [
    'What is the primary goal of DevOps?|A) To eliminate developers|B) To integrate development and operations for faster delivery|C) To reduce system requirements|D) To simplify programming|B',
    'Which tool is used for Infrastructure as Code?|A) Terraform|B) Git|C) Python|D) Docker|A',
    'What is containerization in DevOps?|A) Storing data in containers|B) Packaging applications with dependencies into isolated units|C) Creating virtual machines|D) Organizing team meetings|B',
  ],
  'Agentic AI': [
    'What is an autonomous AI agent?|A) AI that requires human intervention|B) AI that can perceive, decide, and act independently|C) AI used only for data analysis|D) AI that cannot learn|B',
    'Which of these is NOT a component of an AI agent?|A) Perception|B) Decision Making|C) Action|D) Stagnation|D',
    'What does "goal-driven behavior" mean in AI agents?|A) Breaking goals into smaller tasks|B) Agents working towards defined objectives autonomously|C) Goals that change randomly|D) Agents ignoring objectives|B',
  ],
  'Data Science': [
    'Which statistical test is used to determine correlation?|A) T-Test|B) ANOVA|C) Pearson Correlation|D) Chi-Square|C',
    'What is "exploratory data analysis" (EDA)?|A) Building machine learning models|B) Understanding data through visualizations and summaries|C) Creating databases|D) Writing SQL queries|B',
    'What does "data normalization" mean?|A) Checking data is normal|B) Creating new data points|C) Scaling features to a standard range|D) Removing all data|C',
  ],
  'IoT': [
    'What does IoT stand for?|A) Internal Operations Technology|B) Internet of Things|C) Internet of Technology|D) Integrated Operational Tactics|B',
    'Which protocol is commonly used for IoT devices?|A) HTTP only|B) MQTT|C) FTP|D) SMTP|B',
    'What is an IoT "edge device"?|A) A device at the edge of a building|B) A device that processes data locally before sending to cloud|C) A wireless router|D) A smartphone|B',
  ]
};

async function seedQuestions() {
  try {
    // Get all domains
    const { data: domains, error: domainsError } = await supabase
      .from('domains')
      .select('id, name')
      .order('name');

    if (domainsError) throw domainsError;
    console.log(`✅ Found ${domains.length} domains\n`);

    // Clear old questions
    const { error: deleteError } = await supabase
      .from('questions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) throw deleteError;

    let totalInserted = 0;
    let diffIndex = 0;
    const difficulties = ['easy', 'medium', 'hard'];

    for (const domainName of DOMAINS) {
      const domain = domains.find(d => d.name === domainName);
      if (!domain) continue;

      const domainQuestions = QUESTIONS_BY_DOMAIN[domainName] || [];
      const stats = { easy: 0, medium: 0, hard: 0 };

      for (let i = 0; i < domainQuestions.length; i++) {
        const parts = domainQuestions[i].split('|');
        const content = parts[0];
        const correctAnswer = parts[5];
        
        // Distribute difficulties: first = easy, middle = medium, rest = hard
        let difficulty;
        if (i < Math.ceil(domainQuestions.length / 3)) {
          difficulty = 'easy';
        } else if (i < Math.ceil((domainQuestions.length * 2) / 3)) {
          difficulty = 'medium';
        } else {
          difficulty = 'hard';
        }

        const roundType = difficulty === 'easy' ? 'rapid_fire' : 'bidding';

        const { error: insertError } = await supabase.from('questions').insert({
          domain_id: domain.id,
          content: content,
          correct_answer: correctAnswer,
          difficulty: difficulty,
          round_type: roundType,
          is_active: false
        });

        if (insertError) {
          console.error(`❌ ${domainName}: ${insertError.message}`);
        } else {
          totalInserted++;
          stats[difficulty]++;
        }
      }

      console.log(`✅ ${domainName.padEnd(20)} → ${stats.easy} easy + ${stats.medium} medium + ${stats.hard} hard (${domainQuestions.length} total)`);
    }

    console.log(`\n✨ Successfully seeded ${totalInserted} questions across ${DOMAINS.length} domains!`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

console.log('🎓 Enhanced Question Bank Seeding\n');
await seedQuestions();
