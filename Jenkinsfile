stage('Upload to Nexus') {
    steps {
        nexusArtifactUploader(
            nexusVersion: 'nexus3',
            protocol: 'http',
            nexusUrl: '16.112.182.98:8081',
            groupId: 'com.stayhive',
            version: '1.0.0',
            repository: 'maven-releases',
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
