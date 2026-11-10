// Jenkinsfile
// Declarative Jenkins pipeline for Windows build agents

/*
Pipeline Stages:
1. Checkout:            Checks out the source code from the repository.
2. Clean Old Results:   Removes reports from previous builds (the workspace persists between builds).
3. Install Dependencies: Installs project dependencies using npm ci.
4. Install Browser:     Installs Chromium and creates .env from .env.example.
5. Run Playwright Tests: Runs the selected test suite in headless or headed mode.
6. Post Actions:        Archives reports, publishes Allure + HTML reports and emails the build result.

Requirements:
- Plugins: Pipeline, Git, HTML Publisher, Allure, Email Extension, Credentials Binding
- Tools:   Allure Commandline installation (Manage Jenkins > Tools)
- Credential: Secret text with ID "GOREST_TOKEN" (GoRest API token, masked in logs)
*/

pipeline {
  agent any
  tools {
    git 'Default'
  }
  options {
    timestamps()
    timeout(time: 60, unit: 'MINUTES')
  }
  parameters {
    choice(
      name: 'TEST_SUITE',
      choices: ['test:master', 'test:sanity', 'test:regression', 'test:e2e', 'test:api', 'test:web', 'test:datadriven'],
      description: 'Select the test suite to run'
    )
    choice(
      name: 'MODE',
      choices: ['headless', 'headed'],
      description: 'Run tests in headless or headed mode'
    )
  }
  environment {
    CI = '1'
    GOREST_TOKEN = credentials('GOREST_TOKEN')
  }
  stages {
    stage('🔄 Checkout') {
      steps {
        checkout scm
      }
    }
    stage('🧹 Clean Old Results') {
      steps {
        powershell 'Remove-Item -Recurse -Force reports, custom-report, allure-results, test-results -ErrorAction SilentlyContinue'
      }
    }
    stage('📦 Install Dependencies') {
      steps {
        powershell 'npm ci'
      }
    }
    stage('🤖 Install Playwright Browser & .env') {
      steps {
        powershell 'npx playwright install chromium'
        powershell 'Copy-Item .env.example .env -Force'
      }
    }
    stage('▶️ Run Playwright Tests') {
      steps {
        script {
          def modeFlag = params.MODE == 'headed' ? '--headed' : ''
          powershell "npm run ${params.TEST_SUITE} -- --project=chromium ${modeFlag}"
        }
      }
    }
  }
  post {
    always {
      archiveArtifacts artifacts: 'reports/**,custom-report/**,allure-results/**', allowEmptyArchive: true
      allure includeProperties: false, results: [[path: 'allure-results']]
      publishHTML([
        allowMissing: true,
        alwaysLinkToLastBuild: true,
        keepAll: true,
        reportDir: 'reports',
        reportFiles: 'index.html',
        reportName: 'Playwright HTML Report'
      ])
      publishHTML([
        allowMissing: true,
        alwaysLinkToLastBuild: true,
        keepAll: true,
        reportDir: 'custom-report',
        reportFiles: 'index.html,history.html',
        reportName: 'Custom Test Report'
      ])
      emailext(
        subject: "Jenkins Build: ${env.JOB_NAME} #${env.BUILD_NUMBER} - ${currentBuild.currentResult}",
        body: """
            <h2>Playwright Test Execution Report</h2>
            <p><b>Job:</b> ${env.JOB_NAME}</p>
            <p><b>Build:</b> #${env.BUILD_NUMBER}</p>
            <p><b>Status:</b> ${currentBuild.currentResult}</p>
            <p><b>Test Suite:</b> ${params.TEST_SUITE}</p>
            <p><b>Mode:</b> ${params.MODE}</p>
            <p>
              <a href="${env.BUILD_URL}">Open Jenkins Build</a> |
              <a href="${env.BUILD_URL}Playwright_20HTML_20Report">Open Playwright HTML Report</a> |
              <a href="${env.BUILD_URL}Custom_20Test_20Report">Open Custom Report</a> |
              <a href="${env.BUILD_URL}allure">Open Allure Report</a>
            </p>
        """,
        to: 'prashant.chhikara@yahoo.co.in',
        mimeType: 'text/html'
      )
    }
  }
}
