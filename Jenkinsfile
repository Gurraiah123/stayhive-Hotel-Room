pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Create ZIP') {
            steps {
                sh '''
                zip -r stayhive.zip .
                '''
            }
        }

        stage('Upload to Nexus') {
            steps {
                nexusArtifactUploader(
                    nexusVersion: 'nexus3',
                    protocol: 'http',
                    nexusUrl: '16.112.182.98:8081',
                    repository: 'maven-releases',
                    groupId: 'com.stayhive',
                    version: '1.0.0',
                    credentialsId: 'nexus-creds',
                    artifacts: [
                        [
                            artifactId: 'stayhive',
                            classifier: '',
                            file: 'stayhive.zip',
                            type: 'zip'
                        ]
                    ]
                )
            }
        }
    }
}
