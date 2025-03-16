const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Configuration
const config = {
  host: 'ec2-13-233-51-247.ap-south-1.compute.amazonaws.com',
  username: 'ubuntu',
  keyPath: path.join(__dirname, 'agent-server.cer'),
  appName: 'api',  // Changed to match existing PM2 process name
  remoteDir: '/home/ubuntu/analyze',  // Changed to match existing directory
  files: [
    'api.js',
    'agent.js',
    'logger.js',
    'coins.json',
    'package.json',
    'package-lock.json',
    '.env'
  ]
};

// Execute shell command
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.warn(`Warning: ${stderr}`);
      }
      if (stdout) {
        console.log(`Output: ${stdout}`);
      }
      resolve(stdout);
    });
  });
}

// Deploy application
async function deploy() {
  try {
    console.log('Starting deployment...');
    
    // Verify SSH key exists
    if (!fs.existsSync(config.keyPath)) {
      throw new Error(`SSH key not found at ${config.keyPath}`);
    }

    // Create deployment directory
    const deployDir = path.join(__dirname, 'deploy');
    if (!fs.existsSync(deployDir)) {
      fs.mkdirSync(deployDir);
    }

    // Copy files to deploy directory
    console.log('Copying files...');
    for (const file of config.files) {
      if (fs.existsSync(file)) {
        fs.copyFileSync(file, path.join(deployDir, file));
      }
    }

    // Create archive
    console.log('Creating archive...');
    await executeCommand(`cd ${deployDir} && tar -czf ../deploy.tar.gz .`);

    // Upload to EC2
    console.log('Uploading to EC2...');
    await executeCommand(
      `scp -i "${config.keyPath}" deploy.tar.gz ${config.username}@${config.host}:~`
    );

    // Execute remote commands
    const remoteCommands = [
      // Stop the current application
      'pm2 stop api || true',
      
      // Backup existing directory if it exists
      `if [ -d ${config.remoteDir} ]; then mv ${config.remoteDir} ${config.remoteDir}_backup_$(date +%Y%m%d_%H%M%S); fi`,
      
      // Create new directory and extract files
      `mkdir -p ${config.remoteDir}`,
      `tar -xzf ~/deploy.tar.gz -C ${config.remoteDir}`,
      
      // Install dependencies and start application
      `cd ${config.remoteDir}`,
      'npm install --production',
      'pm2 start api.js --name api',
      
      // Cleanup
      'rm ~/deploy.tar.gz'
    ];

    console.log('Executing remote commands...');
    const sshCommand = `ssh -i "${config.keyPath}" ${config.username}@${config.host} '${remoteCommands.join(' && ')}'`;
    await executeCommand(sshCommand);

    // Cleanup local files
    console.log('Cleaning up...');
    fs.unlinkSync('deploy.tar.gz');
    fs.rmSync(deployDir, { recursive: true });

    console.log('Deployment completed successfully!');
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

// Run deployment
deploy(); 