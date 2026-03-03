// tests/ci-report-config.js
// ================================================================
// 🔧 CI/CD 环境测试报告配置
// 用于在 CI 环境中生成和上传测试报告
// ================================================================

const fs = require('fs');
const path = require('path');

/**
 * CI 报告配置
 */
const CI_CONFIG = {
  // GitHub Actions
  github: {
    enabled: !!process.env.GITHUB_ACTIONS,
    workflowName: process.env.GITHUB_WORKFLOW,
    runId: process.env.GITHUB_RUN_ID,
    runNumber: process.env.GITHUB_RUN_NUMBER,
    sha: process.env.GITHUB_SHA,
    ref: process.env.GITHUB_REF,
    actor: process.env.GITHUB_ACTOR,
    repository: process.env.GITHUB_REPOSITORY
  },
  
  // GitLab CI
  gitlab: {
    enabled: !!process.env.GITLAB_CI,
    pipelineId: process.env.CI_PIPELINE_ID,
    jobId: process.env.CI_JOB_ID,
    commitSha: process.env.CI_COMMIT_SHA,
    commitRef: process.env.CI_COMMIT_REF_NAME,
    projectPath: process.env.CI_PROJECT_PATH
  },
  
  // Jenkins
  jenkins: {
    enabled: !!process.env.JENKINS_HOME,
    buildNumber: process.env.BUILD_NUMBER,
    buildId: process.env.BUILD_ID,
    jobName: process.env.JOB_NAME,
    buildUrl: process.env.BUILD_URL
  },
  
  // 通用 CI 检测
  isCI: !!process.env.CI
};

/**
 * 获取当前 CI 环境
 */
function getCurrentCI() {
  if (CI_CONFIG.github.enabled) return 'github';
  if (CI_CONFIG.gitlab.enabled) return 'gitlab';
  if (CI_CONFIG.jenkins.enabled) return 'jenkins';
  if (CI_CONFIG.isCI) return 'unknown';
  return null;
}

/**
 * 生成 CI 元数据
 */
function generateCIMetadata() {
  const ci = getCurrentCI();
  
  if (!ci) {
    return {
      ci: false,
      environment: 'local',
      timestamp: new Date().toISOString()
    };
  }
  
  const metadata = {
    ci: true,
    environment: ci,
    timestamp: new Date().toISOString()
  };
  
  // 添加特定 CI 的元数据
  if (ci === 'github') {
    Object.assign(metadata, {
      workflow: CI_CONFIG.github.workflowName,
      runId: CI_CONFIG.github.runId,
      runNumber: CI_CONFIG.github.runNumber,
      sha: CI_CONFIG.github.sha,
      ref: CI_CONFIG.github.ref,
      actor: CI_CONFIG.github.actor,
      repository: CI_CONFIG.github.repository,
      runUrl: `https://github.com/${CI_CONFIG.github.repository}/actions/runs/${CI_CONFIG.github.runId}`
    });
  } else if (ci === 'gitlab') {
    Object.assign(metadata, {
      pipelineId: CI_CONFIG.gitlab.pipelineId,
      jobId: CI_CONFIG.gitlab.jobId,
      commitSha: CI_CONFIG.gitlab.commitSha,
      commitRef: CI_CONFIG.gitlab.commitRef,
      projectPath: CI_CONFIG.gitlab.projectPath
    });
  } else if (ci === 'jenkins') {
    Object.assign(metadata, {
      buildNumber: CI_CONFIG.jenkins.buildNumber,
      buildId: CI_CONFIG.jenkins.buildId,
      jobName: CI_CONFIG.jenkins.jobName,
      buildUrl: CI_CONFIG.jenkins.buildUrl
    });
  }
  
  return metadata;
}

/**
 * 保存 CI 元数据
 */
function saveCIMetadata() {
  const metadata = generateCIMetadata();
  const reportDir = path.join(__dirname, 'playwright-report');
  
  // 确保报告目录存在
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const metadataFile = path.join(reportDir, 'ci-metadata.json');
  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2), 'utf-8');
  
  console.log('✅ CI 元数据已保存:', metadataFile);
  
  return metadata;
}

/**
 * 生成 CI 友好的摘要
 */
function generateCISummary(results) {
  const ci = getCurrentCI();
  
  if (!ci) {
    return null;
  }
  
  const stats = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  };
  
  // 统计测试结果
  for (const suite of results.suites || []) {
    countTests(suite, stats);
  }
  
  // 生成摘要
  const summary = {
    status: stats.failed === 0 ? 'success' : 'failure',
    total: stats.total,
    passed: stats.passed,
    failed: stats.failed,
    skipped: stats.skipped,
    passRate: stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(2) : 0,
    duration: results.duration || 0
  };
  
  // GitHub Actions 特殊格式
  if (ci === 'github') {
    console.log('\n::group::Test Summary');
    console.log(`Total: ${summary.total}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Skipped: ${summary.skipped}`);
    console.log(`Pass Rate: ${summary.passRate}%`);
    console.log('::endgroup::');
    
    if (stats.failed > 0) {
      console.log(`::error::${stats.failed} test(s) failed`);
    }
  }
  
  return summary;
}

/**
 * 统计测试数量
 */
function countTests(suite, stats) {
  for (const spec of suite.specs || []) {
    for (const test of spec.tests || []) {
      stats.total++;
      
      const results = test.results || [];
      const lastResult = results[results.length - 1];
      
      if (!lastResult) continue;
      
      if (lastResult.status === 'passed') {
        stats.passed++;
      } else if (lastResult.status === 'failed') {
        stats.failed++;
      } else if (lastResult.status === 'skipped') {
        stats.skipped++;
      }
    }
  }
  
  for (const child of suite.suites || []) {
    countTests(child, stats);
  }
}

/**
 * 主函数
 */
function main() {
  const command = process.argv[2];
  
  if (command === 'metadata') {
    const metadata = saveCIMetadata();
    console.log(JSON.stringify(metadata, null, 2));
  } else if (command === 'summary') {
    const resultsFile = path.join(__dirname, 'playwright-report', 'results.json');
    
    if (!fs.existsSync(resultsFile)) {
      console.error('❌ 未找到测试结果文件');
      process.exit(1);
    }
    
    const results = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));
    const summary = generateCISummary(results);
    
    if (summary) {
      console.log(JSON.stringify(summary, null, 2));
      
      if (summary.status === 'failure') {
        process.exit(1);
      }
    }
  } else {
    console.log(`
🔧 CI/CD 报告配置工具

用法:
  node tests/ci-report-config.js <命令>

命令:
  metadata    生成并保存 CI 元数据
  summary     生成 CI 友好的测试摘要

示例:
  node tests/ci-report-config.js metadata
  node tests/ci-report-config.js summary
    `);
  }
}

// 如果直接运行
if (require.main === module) {
  main();
}

module.exports = {
  CI_CONFIG,
  getCurrentCI,
  generateCIMetadata,
  saveCIMetadata,
  generateCISummary
};
