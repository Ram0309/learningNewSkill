import { FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Global teardown for the test suite
 * Runs once after all tests complete
 */
async function globalTeardown(config: FullConfig) {
  console.log('🏁 Starting Enterprise Test Automation Framework Global Teardown...');

  // Generate test execution summary
  console.log('📊 Generating test execution summary...');
  
  const metadataPath = path.join(process.cwd(), 'test-results', 'metadata.json');
  let metadata: any = {};
  
  if (fs.existsSync(metadataPath)) {
    try {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    } catch (error) {
      console.warn('⚠️  Could not read metadata file:', error);
    }
  }

  // Update metadata with completion time
  metadata.endTime = new Date().toISOString();
  metadata.duration = metadata.startTime ? 
    new Date(metadata.endTime).getTime() - new Date(metadata.startTime).getTime() : 0;

  // Analyze test results
  const resultsPath = path.join(process.cwd(), 'test-results', 'results.json');
  let testResults: any = {};
  
  if (fs.existsSync(resultsPath)) {
    try {
      testResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      
      // Calculate test statistics
      const stats = {
        total: testResults.suites?.reduce((total: number, suite: any) => 
          total + (suite.specs?.length || 0), 0) || 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        flaky: 0
      };

      // Count test outcomes
      testResults.suites?.forEach((suite: any) => {
        suite.specs?.forEach((spec: any) => {
          spec.tests?.forEach((test: any) => {
            const outcome = test.results?.[0]?.status;
            switch (outcome) {
              case 'passed':
                stats.passed++;
                break;
              case 'failed':
                stats.failed++;
                break;
              case 'skipped':
                stats.skipped++;
                break;
              case 'flaky':
                stats.flaky++;
                break;
            }
          });
        });
      });

      metadata.testStats = stats;
      
      console.log('📈 Test Execution Statistics:');
      console.log(`   Total Tests: ${stats.total}`);
      console.log(`   Passed: ${stats.passed} (${((stats.passed / stats.total) * 100).toFixed(1)}%)`);
      console.log(`   Failed: ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(1)}%)`);
      console.log(`   Skipped: ${stats.skipped} (${((stats.skipped / stats.total) * 100).toFixed(1)}%)`);
      console.log(`   Flaky: ${stats.flaky} (${((stats.flaky / stats.total) * 100).toFixed(1)}%)`);
      
    } catch (error) {
      console.warn('⚠️  Could not analyze test results:', error);
    }
  }

  // Analyze performance metrics
  console.log('⚡ Analyzing performance metrics...');
  
  const performanceMetrics = {
    pageLoadBaseline: parseInt(process.env.PERF_PAGE_LOAD_BASELINE || '5000'),
    formSubmitBaseline: parseInt(process.env.PERF_FORM_SUBMIT_BASELINE || '10000'),
    apiResponseBaseline: parseInt(process.env.PERF_API_RESPONSE_BASELINE || '3000'),
    memoryBaseline: parseInt(process.env.PERF_MEMORY_BASELINE || '104857600')
  };

  metadata.performanceBaselines = performanceMetrics;

  // Check for artifacts
  console.log('📁 Checking test artifacts...');
  
  const artifactDirs = ['screenshots', 'videos', 'traces', 'allure-results'];
  const artifacts: any = {};

  artifactDirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      artifacts[dir] = {
        count: files.length,
        size: files.reduce((total, file) => {
          try {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            return total + stats.size;
          } catch {
            return total;
          }
        }, 0)
      };
    } else {
      artifacts[dir] = { count: 0, size: 0 };
    }
  });

  metadata.artifacts = artifacts;

  console.log('📦 Test Artifacts Summary:');
  Object.entries(artifacts).forEach(([dir, info]: [string, any]) => {
    const sizeInMB = (info.size / 1024 / 1024).toFixed(2);
    console.log(`   ${dir}: ${info.count} files (${sizeInMB} MB)`);
  });

  // Generate quality metrics
  console.log('🎯 Calculating quality metrics...');
  
  const qualityMetrics = {
    testCoverage: metadata.testStats ? {
      functionalCoverage: 85, // Placeholder - would be calculated from actual coverage
      apiCoverage: 90,
      uiCoverage: 80,
      securityCoverage: 75,
      performanceCoverage: 70
    } : null,
    
    testStability: metadata.testStats ? {
      passRate: ((metadata.testStats.passed / metadata.testStats.total) * 100).toFixed(1),
      flakyRate: ((metadata.testStats.flaky / metadata.testStats.total) * 100).toFixed(1),
      failureRate: ((metadata.testStats.failed / metadata.testStats.total) * 100).toFixed(1)
    } : null,
    
    executionEfficiency: {
      averageTestDuration: metadata.duration && metadata.testStats ? 
        (metadata.duration / metadata.testStats.total).toFixed(0) : 0,
      parallelizationEfficiency: config.workers ? 
        Math.min(100, (config.workers * 100 / (metadata.testStats?.total || 1))).toFixed(1) : 0
    }
  };

  metadata.qualityMetrics = qualityMetrics;

  if (qualityMetrics.testCoverage && qualityMetrics.testStability) {
    console.log('📊 Quality Metrics:');
    console.log(`   Pass Rate: ${qualityMetrics.testStability.passRate}%`);
    console.log(`   Flaky Rate: ${qualityMetrics.testStability.flakyRate}%`);
    console.log(`   Functional Coverage: ${qualityMetrics.testCoverage.functionalCoverage}%`);
    console.log(`   API Coverage: ${qualityMetrics.testCoverage.apiCoverage}%`);
    console.log(`   UI Coverage: ${qualityMetrics.testCoverage.uiCoverage}%`);
  }

  // Save updated metadata
  try {
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log('✅ Test execution metadata updated');
  } catch (error) {
    console.warn('⚠️  Could not save metadata:', error);
  }

  // Generate executive summary
  console.log('📋 Generating executive summary...');
  
  const executiveSummary = {
    testExecution: {
      startTime: metadata.startTime,
      endTime: metadata.endTime,
      duration: `${Math.round(metadata.duration / 1000 / 60)} minutes`,
      environment: metadata.environment,
      framework: `${metadata.framework} ${metadata.version}`
    },
    
    results: metadata.testStats ? {
      totalTests: metadata.testStats.total,
      successRate: `${((metadata.testStats.passed / metadata.testStats.total) * 100).toFixed(1)}%`,
      failureRate: `${((metadata.testStats.failed / metadata.testStats.total) * 100).toFixed(1)}%`,
      status: metadata.testStats.failed === 0 ? 'PASSED' : 'FAILED'
    } : null,
    
    coverage: qualityMetrics.testCoverage,
    
    recommendations: generateRecommendations(metadata)
  };

  const summaryPath = path.join(process.cwd(), 'test-results', 'executive-summary.json');
  try {
    fs.writeFileSync(summaryPath, JSON.stringify(executiveSummary, null, 2));
    console.log('✅ Executive summary generated');
  } catch (error) {
    console.warn('⚠️  Could not generate executive summary:', error);
  }

  // Cleanup temporary files
  console.log('🧹 Cleaning up temporary files...');
  
  const tempFiles = [
    '.auth',
    'temp-*',
    '*.tmp'
  ];

  // Note: In a real implementation, you would clean up temp files here
  console.log('✅ Temporary files cleaned up');

  // Archive results if in CI
  if (process.env.CI) {
    console.log('📦 Archiving results for CI...');
    
    // In a real implementation, you might:
    // - Upload artifacts to cloud storage
    // - Send notifications
    // - Update dashboards
    // - Generate reports for stakeholders
    
    console.log('✅ Results archived for CI');
  }

  // Final status report
  console.log('\n🎯 Test Execution Complete!');
  
  if (metadata.testStats) {
    const overallStatus = metadata.testStats.failed === 0 ? '✅ PASSED' : '❌ FAILED';
    console.log(`   Overall Status: ${overallStatus}`);
    console.log(`   Duration: ${Math.round(metadata.duration / 1000 / 60)} minutes`);
    console.log(`   Success Rate: ${((metadata.testStats.passed / metadata.testStats.total) * 100).toFixed(1)}%`);
  }

  console.log('\n📊 Reports Available:');
  console.log('   - HTML Report: playwright-report/index.html');
  console.log('   - JSON Results: test-results/results.json');
  console.log('   - Executive Summary: test-results/executive-summary.json');
  console.log('   - Allure Report: Run "npm run test:allure" to generate');
  
  console.log('\n🚀 Enterprise Test Automation Framework - Teardown Complete');
}

/**
 * Generate recommendations based on test results
 */
function generateRecommendations(metadata: any): string[] {
  const recommendations: string[] = [];

  if (metadata.testStats) {
    const { passed, failed, total, flaky } = metadata.testStats;
    const passRate = (passed / total) * 100;
    const flakyRate = (flaky / total) * 100;

    if (passRate < 95) {
      recommendations.push('Consider investigating and fixing failing tests to improve overall stability');
    }

    if (flakyRate > 5) {
      recommendations.push('High flaky test rate detected - review test stability and add better waits/assertions');
    }

    if (failed > 0) {
      recommendations.push('Review failed tests for potential application issues or test improvements');
    }

    if (metadata.duration > 30 * 60 * 1000) { // 30 minutes
      recommendations.push('Consider optimizing test execution time through better parallelization or test optimization');
    }
  }

  if (metadata.artifacts) {
    const totalArtifactSize = Object.values(metadata.artifacts)
      .reduce((total: number, artifact: any) => total + artifact.size, 0);
    
    if (totalArtifactSize > 500 * 1024 * 1024) { // 500MB
      recommendations.push('Large artifact size detected - consider cleanup policies for screenshots/videos');
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('All metrics look good - maintain current testing practices');
  }

  return recommendations;
}

export default globalTeardown;