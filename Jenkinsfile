pipeline {

    agent any

    options {
        timestamps()
        ansiColor('xterm')
    }

    environment {

        FRONTEND = "frontend"
        BACKEND = "backend"

        FRONTEND_IMAGE = "guru0114/stayhive-frontend"
        BACKEND_IMAGE = "guru0114/stayhive-backend"

        IMAGE_TAG = "${BUILD_NUMBER}"

        NEXUS_URL = "16.112.182.98:8081"
        NEXUS_REPO = "stayhive-raw"
    }

    stages {

        stage('Checkout Source') {
            steps {
                checkout scm
            }
        }

        stage('Display Project Structure') {
            steps {
                sh '''
                echo "========== Project Structure =========="
                pwd
                ls -la

                echo "========== Frontend =========="
                ls -la frontend

                echo "========== Backend =========="
                ls -la backend
                '''
            }
        }

        stage('Backend Dependencies') {
            steps {
                dir("${BACKEND}") {
                    sh 'npm install'
                }
            }
        }

        stage('SonarQube Scan') {
            steps {
                withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                    sh '''
                    docker run --rm \
                      -e SONAR_HOST_URL=http://16.112.182.98:9000 \
                      -e SONAR_TOKEN=$SONAR_TOKEN \
                      -v "$WORKSPACE:/usr/src" \
                      -w /usr/src \
                      sonarsource/sonar-scanner-cli \
                      -Dsonar.projectKey=stayhive \
                      -Dsonar.projectName=StayHive \
                      -Dsonar.sources=. \
                      -Dsonar.exclusions=**/node_modules/**,**/.git/** \
                      -Dsonar.sourceEncoding=UTF-8
                    '''
                }
            }
        }

        stage('Docker Login') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )
                ]) {
                    sh '''
                    echo "$DOCKER_PASS" | docker login \
                    -u "$DOCKER_USER" \
                    --password-stdin
                    '''
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh """
                docker build -t ${FRONTEND_IMAGE}:${IMAGE_TAG} ./frontend
                docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} ./backend

                docker tag ${FRONTEND_IMAGE}:${IMAGE_TAG} ${FRONTEND_IMAGE}:latest
                docker tag ${BACKEND_IMAGE}:${IMAGE_TAG} ${BACKEND_IMAGE}:latest
                """
            }
        }

        stage('Push Docker Images') {
            steps {
                sh """
                docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}
                docker push ${FRONTEND_IMAGE}:latest

                docker push ${BACKEND_IMAGE}:${IMAGE_TAG}
                docker push ${BACKEND_IMAGE}:latest
                """
            }
        }

        stage('Package Artifact') {
            steps {
                sh '''
                zip -r stayhive.zip . \
                -x "*.git*" \
                -x "backend/node_modules/*"
                '''
            }
        }

        stage('Upload Artifact To Nexus') {
            steps {
                nexusArtifactUploader(
                    nexusVersion: 'nexus3',
                    protocol: 'http',
                    nexusUrl: '16.112.182.98:8081',
                    repository: 'stayhive-raw',
                    groupId: 'com.stayhive',
                    version: "1.0.${BUILD_NUMBER}",
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

        stage('Deploy Containers') {
            steps {
                sh '''
                docker compose down || true
                docker compose pull
                docker compose up -d
                docker image prune -af
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                echo "========== Running Containers =========="
                docker ps

                echo ""
                docker compose ps
                '''
            }
        }
    }

    post {

        success {
            echo "========================================"
            echo "StayHive Deployment Successful"
            echo "========================================"
        }

        failure {
            echo "========================================"
            echo "StayHive Deployment Failed"
            echo "========================================"
        }

        always {
            cleanWs()
        }
    }
}
